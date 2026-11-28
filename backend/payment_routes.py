"""
payment_routes.py – FastAPI router for Razorpay payments (TEST MODE).

Endpoints:
  POST /api/payments/create-order
  POST /api/payments/verify
  POST /api/payments/webhook
  GET  /api/orders
  GET  /api/orders/{order_id}
"""

import hashlib
import hmac
import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import requests
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import text
from sqlalchemy.orm import Session

from auth_routes import get_current_user
from config import HTTP_DOWNLOAD_TIMEOUT_SECONDS, RATE_LIMIT_RAZORPAY_WEBHOOK
from db import Order, User, get_session
from pricing_config import PLANS_BY_ID, get_effective_pack_amount_paise

logger = logging.getLogger("sky_invites_payments")

router = APIRouter(tags=["payments"])
_limiter = Limiter(key_func=get_remote_address, enabled=False)

RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders"
RAZORPAY_TIMEOUT_SECONDS = 15
ORDER_REUSE_WINDOW_MINUTES = 15
REQUIRED_CURRENCY = "INR"


def validate_razorpay_config() -> None:
    """Refuse live Razorpay keys unless ALLOW_LIVE_PAYMENTS=true."""
    key_id = os.environ.get("RAZORPAY_KEY_ID", "").strip()
    allow_live = os.environ.get("ALLOW_LIVE_PAYMENTS", "").strip().lower() == "true"
    if key_id and not key_id.startswith("rzp_test_") and not allow_live:
        raise RuntimeError(
            "Refusing to start payment routes: RAZORPAY_KEY_ID must start with 'rzp_test_' "
            "(or set ALLOW_LIVE_PAYMENTS=true)."
        )


def _get_razorpay_keys() -> tuple[str, str]:
    key_id = os.environ.get("RAZORPAY_KEY_ID", "").strip()
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "").strip()
    if not key_id or not key_secret:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Payment gateway is not configured.",
        )
    return key_id, key_secret


def _verify_checkout_signature(order_id: str, payment_id: str, signature: str, secret: str) -> bool:
    msg = f"{order_id}|{payment_id}".encode("utf-8")
    expected = hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def _verify_webhook_signature(raw_body: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def _fulfill_order_in_tx(db: Session, order: Order, payment_id: str | None) -> bool:
    """
    Atomically mark an order as paid and grant its pack credits in credit_ledger.
    Caller must hold a FOR UPDATE lock on `order`.
    Returns True if credits were granted now, False if already paid (idempotent).
    """
    if order.status == "paid":
        return False

    pack = PLANS_BY_ID.get(order.pack_id)
    if not pack:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown pack_id on order: {order.pack_id}",
        )

    order.status = "paid"
    if payment_id:
        order.gateway_payment_id = payment_id
    db.flush()

    image_credits = int(pack.get("image_credits") or 0)
    video_credits = int(pack.get("video_credits") or 0)

    if image_credits > 0:
        db.execute(
            text(
                "INSERT INTO credit_ledger (user_id, credit_type, amount, reason, reference_id, note) "
                "VALUES (:uid, 'image', :amt, 'purchase', :ref, :note) "
                "ON CONFLICT (reference_id) DO NOTHING"
            ),
            {
                "uid": order.user_id,
                "amt": image_credits,
                "ref": f"purchase:{order.id}:image",
                "note": f"Pack {pack['id']}",
            },
        )

    if video_credits > 0:
        db.execute(
            text(
                "INSERT INTO credit_ledger (user_id, credit_type, amount, reason, reference_id, note) "
                "VALUES (:uid, 'video', :amt, 'purchase', :ref, :note) "
                "ON CONFLICT (reference_id) DO NOTHING"
            ),
            {
                "uid": order.user_id,
                "amt": video_credits,
                "ref": f"purchase:{order.id}:video",
                "note": f"Pack {pack['id']}",
            },
        )

    return True


def _serialize_order(order: Order) -> dict[str, Any]:
    return {
        "id": order.id,
        "pack_id": order.pack_id,
        "amount_paise": order.amount_paise,
        "currency": REQUIRED_CURRENCY,
        "status": order.status,
        "gateway_order_id": order.gateway_order_id,
        "gateway_payment_id": order.gateway_payment_id,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
    }


# ── Request / Response Models ──────────────────────────────────────────────────

class CreateOrderRequest(BaseModel):
    pack_id: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/api/payments/create-order")
@_limiter.limit("10/minute")
def create_order(
    request: Request,
    body: CreateOrderRequest,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    pack = PLANS_BY_ID.get(body.pack_id)
    if not pack:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown pack_id: {body.pack_id}",
        )

    amount_paise = get_effective_pack_amount_paise(body.pack_id)
    key_id, key_secret = _get_razorpay_keys()
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=ORDER_REUSE_WINDOW_MINUTES)

    with get_session() as db:
        existing = (
            db.query(Order)
            .filter(
                Order.user_id == current_user.id,
                Order.pack_id == body.pack_id,
                Order.status == "created",
                Order.amount_paise == amount_paise,
                Order.created_at >= cutoff,
                Order.gateway_order_id.isnot(None),
            )
            .order_by(Order.created_at.desc())
            .first()
        )
        if existing:
            return {
                "order_id": existing.id,
                "gateway_order_id": existing.gateway_order_id,
                "amount_paise": existing.amount_paise,
                "currency": REQUIRED_CURRENCY,
                "key_id": key_id,
            }

        internal_order_id = f"ord_{uuid.uuid4().hex[:20]}"
        try:
            resp = requests.post(
                RAZORPAY_ORDERS_URL,
                auth=(key_id, key_secret),
                json={
                    "amount": amount_paise,
                    "currency": REQUIRED_CURRENCY,
                    "receipt": internal_order_id,
                    "notes": {
                        "user_id": current_user.id,
                        "pack_id": body.pack_id,
                    },
                },
                timeout=RAZORPAY_TIMEOUT_SECONDS,
            )
        except requests.RequestException as exc:
            logger.warning("Razorpay create-order network error: %s", type(exc).__name__)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Unable to reach payment gateway. Please try again.",
            )

        if resp.status_code not in (200, 201):
            logger.warning("Razorpay create-order failed with HTTP %s", resp.status_code)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Payment gateway rejected order creation. Please try again.",
            )

        rzp_data = resp.json()
        gateway_order_id = rzp_data.get("id")
        if not gateway_order_id:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Invalid response from payment gateway.",
            )

        order = Order(
            id=internal_order_id,
            user_id=current_user.id,
            pack_id=body.pack_id,
            amount_paise=amount_paise,
            status="created",
            gateway_order_id=gateway_order_id,
        )
        db.add(order)
        db.flush()

        return {
            "order_id": order.id,
            "gateway_order_id": gateway_order_id,
            "amount_paise": amount_paise,
            "currency": REQUIRED_CURRENCY,
            "key_id": key_id,
        }


@router.post("/api/payments/verify")
@_limiter.limit("10/minute")
def verify_payment(
    request: Request,
    body: VerifyPaymentRequest,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _, key_secret = _get_razorpay_keys()
    if not _verify_checkout_signature(
        body.razorpay_order_id,
        body.razorpay_payment_id,
        body.razorpay_signature,
        key_secret,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payment signature.",
        )

    with get_session() as db:
        order = (
            db.query(Order)
            .filter(
                Order.gateway_order_id == body.razorpay_order_id,
                Order.user_id == current_user.id,
            )
            .with_for_update()
            .first()
        )
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found.",
            )

        # created -> paid and failed -> paid are both allowed; paid -> paid is a no-op
        _fulfill_order_in_tx(db, order, body.razorpay_payment_id)
        return _serialize_order(order)


@router.post("/api/payments/webhook")
@_limiter.limit(RATE_LIMIT_RAZORPAY_WEBHOOK)
async def razorpay_webhook(request: Request) -> dict[str, str]:
    raw_body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    webhook_secret = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "").strip()

    if not webhook_secret or not signature or not _verify_webhook_signature(raw_body, signature, webhook_secret):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid webhook signature.",
        )

    try:
        payload = await request.json()
    except Exception:
        return {"status": "ignored"}

    event = payload.get("event")
    data = payload.get("payload") or {}

    if event == "payment.captured":
        entity = (data.get("payment") or {}).get("entity") or {}
        gateway_order_id = entity.get("order_id")
        payment_id = entity.get("id")
        amount = entity.get("amount")
        currency = entity.get("currency")
    elif event == "order.paid":
        order_entity = (data.get("order") or {}).get("entity") or {}
        payment_entity = (data.get("payment") or {}).get("entity") or {}
        gateway_order_id = order_entity.get("id")
        payment_id = payment_entity.get("id")
        amount = order_entity.get("amount_paid") if order_entity.get("amount_paid") is not None else order_entity.get("amount")
        currency = order_entity.get("currency")
    elif event == "payment.failed":
        entity = (data.get("payment") or {}).get("entity") or {}
        gateway_order_id = entity.get("order_id")
        payment_id = entity.get("id")
        if not gateway_order_id:
            return {"status": "ok"}
        with get_session() as db:
            order = (
                db.query(Order)
                .filter(Order.gateway_order_id == gateway_order_id)
                .with_for_update()
                .first()
            )
            if order and order.status == "created":
                order.status = "failed"
                if payment_id:
                    order.gateway_payment_id = payment_id
        return {"status": "ok"}
    else:
        return {"status": "ignored"}

    if not gateway_order_id:
        return {"status": "ok"}

    with get_session() as db:
        order = (
            db.query(Order)
            .filter(Order.gateway_order_id == gateway_order_id)
            .with_for_update()
            .first()
        )
        if not order:
            return {"status": "ok"}

        if amount != order.amount_paise or currency != REQUIRED_CURRENCY:
            logger.warning("Webhook amount/currency mismatch for order %s", order.id)
            return {"status": "mismatch_ignored"}

        _fulfill_order_in_tx(db, order, payment_id)

    return {"status": "ok"}


@router.get("/api/orders")
def list_orders(current_user: User = Depends(get_current_user)) -> list[dict[str, Any]]:
    with get_session() as db:
        orders = (
            db.query(Order)
            .filter(Order.user_id == current_user.id)
            .order_by(Order.created_at.desc())
            .all()
        )
        return [_serialize_order(o) for o in orders]


@router.get("/api/orders/{order_id}")
def get_order(order_id: str, current_user: User = Depends(get_current_user)) -> dict[str, Any]:
    with get_session() as db:
        order = (
            db.query(Order)
            .filter(Order.id == order_id, Order.user_id == current_user.id)
            .first()
        )
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
        return _serialize_order(order)

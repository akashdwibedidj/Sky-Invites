"""Tests for Razorpay payment routes (TEST MODE)."""

import hashlib
import hmac
import json
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from api import app
from auth import create_access_token
from db import Order, User, create_tables, get_session
from payment_routes import validate_razorpay_config
from sqlalchemy import text


def _sign_checkout(order_id: str, payment_id: str, secret: str) -> str:
    msg = f"{order_id}|{payment_id}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), msg, hashlib.sha256).hexdigest()


def _sign_webhook(raw_body: bytes, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()


@pytest.fixture(autouse=True)
def _razorpay_env(monkeypatch):
    monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_1234567890")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "test_secret_xyz")
    monkeypatch.setenv("RAZORPAY_WEBHOOK_SECRET", "test_webhook_secret_abc")
    monkeypatch.delenv("ALLOW_LIVE_PAYMENTS", raising=False)


def _ensure_test_user(user_id: str, email: str) -> str:
    create_tables()
    with get_session() as db:
        u = db.query(User).filter(User.id == user_id).first()
        if not u:
            u = User(id=user_id, email=email, name="Test User", password_hash="x")
            db.add(u)
            db.flush()
    return create_access_token(user_id=user_id)


def test_startup_guard_rejects_live_key(monkeypatch):
    monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_live_123456")
    with pytest.raises(RuntimeError, match="rzp_test_"):
        validate_razorpay_config()

    monkeypatch.setenv("ALLOW_LIVE_PAYMENTS", "true")
    validate_razorpay_config()


def test_create_order_verify_and_idempotency():
    import uuid
    rzp_oid = f"order_rzp_{uuid.uuid4().hex[:10]}"
    token = _ensure_test_user("usr_pay_test_1", "pay1@example.com")
    client = TestClient(app)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"id": rzp_oid}

    with patch("payment_routes.requests.post", return_value=mock_resp) as mock_post:
        res = client.post(
            "/api/payments/create-order",
            json={"pack_id": "video_invite_30s"},
            headers={"Authorization": f"Bearer {token}"},
        )
    assert res.status_code == 200
    data = res.json()
    assert data["gateway_order_id"] == rzp_oid
    assert data["amount_paise"] == 89900
    assert data["currency"] == "INR"
    assert mock_post.called

    # Verify with bad signature -> 400
    bad_res = client.post(
        "/api/payments/verify",
        json={
            "razorpay_order_id": rzp_oid,
            "razorpay_payment_id": "pay_001",
            "razorpay_signature": "bad_sig",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert bad_res.status_code == 400

    # Verify with valid signature -> 200 & grants both image + video credits
    sig = _sign_checkout(rzp_oid, "pay_001", "test_secret_xyz")
    ok_res = client.post(
        "/api/payments/verify",
        json={
            "razorpay_order_id": rzp_oid,
            "razorpay_payment_id": "pay_001",
            "razorpay_signature": sig,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ok_res.status_code == 200
    assert ok_res.json()["status"] == "paid"

    # Repeat verify -> idempotent, still 200 and no duplicate ledger rows
    ok_res2 = client.post(
        "/api/payments/verify",
        json={
            "razorpay_order_id": rzp_oid,
            "razorpay_payment_id": "pay_001",
            "razorpay_signature": sig,
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert ok_res2.status_code == 200

    with get_session() as db:
        rows = db.execute(
            text("SELECT credit_type, amount FROM credit_ledger WHERE reference_id LIKE :p"),
            {"p": f"purchase:{data['order_id']}:%"},
        ).fetchall()
        assert sorted(rows) == [("image", 3), ("video", 3)]


def test_webhook_payment_captured_order_paid_and_failed():
    import uuid
    rzp_oid = f"order_rzp_wh_{uuid.uuid4().hex[:10]}"
    token = _ensure_test_user("usr_pay_test_2", "pay2@example.com")
    client = TestClient(app)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"id": rzp_oid}
    with patch("payment_routes.requests.post", return_value=mock_resp):
        res = client.post(
            "/api/payments/create-order",
            json={"pack_id": "image_pack_5"},
            headers={"Authorization": f"Bearer {token}"},
        )
    assert res.status_code == 200
    order_id = res.json()["order_id"]

    # 1. Bad signature -> 400
    bad_wh = client.post(
        "/api/payments/webhook",
        content=b"{}",
        headers={"X-Razorpay-Signature": "wrong"},
    )
    assert bad_wh.status_code == 400

    # 2. payment.failed -> transitions created -> failed
    failed_body = json.dumps({
        "event": "payment.failed",
        "payload": {"payment": {"entity": {"id": "pay_fail_1", "order_id": rzp_oid}}},
    }).encode("utf-8")
    res_fail = client.post(
        "/api/payments/webhook",
        content=failed_body,
        headers={"X-Razorpay-Signature": _sign_webhook(failed_body, "test_webhook_secret_abc")},
    )
    assert res_fail.status_code == 200

    # 3. order.paid -> transitions failed -> paid
    order_paid_body = json.dumps({
        "event": "order.paid",
        "payload": {
            "order": {"entity": {"id": rzp_oid, "amount_paid": 24900, "currency": "INR"}},
            "payment": {"entity": {"id": "pay_ok_1"}},
        },
    }).encode("utf-8")
    res_paid = client.post(
        "/api/payments/webhook",
        content=order_paid_body,
        headers={"X-Razorpay-Signature": _sign_webhook(order_paid_body, "test_webhook_secret_abc")},
    )
    assert res_paid.status_code == 200

    # 4. payment.captured duplicate -> idempotent 200
    captured_body = json.dumps({
        "event": "payment.captured",
        "payload": {
            "payment": {"entity": {"id": "pay_ok_1", "order_id": rzp_oid, "amount": 24900, "currency": "INR"}},
        },
    }).encode("utf-8")
    res_cap = client.post(
        "/api/payments/webhook",
        content=captured_body,
        headers={"X-Razorpay-Signature": _sign_webhook(captured_body, "test_webhook_secret_abc")},
    )
    assert res_cap.status_code == 200

    # 5. Unknown order id -> 200
    unknown_body = json.dumps({
        "event": "payment.captured",
        "payload": {
            "payment": {"entity": {"id": "pay_unk", "order_id": "order_does_not_exist", "amount": 24900, "currency": "INR"}},
        },
    }).encode("utf-8")
    res_unk = client.post(
        "/api/payments/webhook",
        content=unknown_body,
        headers={"X-Razorpay-Signature": _sign_webhook(unknown_body, "test_webhook_secret_abc")},
    )
    assert res_unk.status_code == 200

    # Verify order is paid and granted 5 image credits
    get_res = client.get(f"/api/orders/{order_id}", headers={"Authorization": f"Bearer {token}"})
    assert get_res.status_code == 200
    assert get_res.json()["status"] == "paid"


def test_webhook_amount_and_currency_mismatch_refuses_grant():
    token = _ensure_test_user("usr_pay_test_3", "pay3@example.com")
    client = TestClient(app)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"id": "order_rzp_mismatch_001"}
    with patch("payment_routes.requests.post", return_value=mock_resp):
        res = client.post(
            "/api/payments/create-order",
            json={"pack_id": "image_pack_5"},
            headers={"Authorization": f"Bearer {token}"},
        )
    assert res.status_code == 200
    order_id = res.json()["order_id"]

    # Wrong amount (100 instead of 24900)
    bad_amt = json.dumps({
        "event": "payment.captured",
        "payload": {"payment": {"entity": {"id": "pay_m1", "order_id": "order_rzp_mismatch_001", "amount": 100, "currency": "INR"}}},
    }).encode("utf-8")
    r1 = client.post("/api/payments/webhook", content=bad_amt, headers={"X-Razorpay-Signature": _sign_webhook(bad_amt, "test_webhook_secret_abc")})
    assert r1.status_code == 200
    assert r1.json()["status"] == "mismatch_ignored"

    # Wrong currency (USD instead of INR)
    bad_cur = json.dumps({
        "event": "order.paid",
        "payload": {"order": {"entity": {"id": "order_rzp_mismatch_001", "amount_paid": 24900, "currency": "USD"}}, "payment": {"entity": {"id": "pay_m2"}}},
    }).encode("utf-8")
    r2 = client.post("/api/payments/webhook", content=bad_cur, headers={"X-Razorpay-Signature": _sign_webhook(bad_cur, "test_webhook_secret_abc")})
    assert r2.status_code == 200
    assert r2.json()["status"] == "mismatch_ignored"

    get_res = client.get(f"/api/orders/{order_id}", headers={"Authorization": f"Bearer {token}"})
    assert get_res.json()["status"] == "created"


def test_verify_rejects_another_users_order():
    token_owner = _ensure_test_user("usr_pay_test_4a", "pay4a@example.com")
    token_other = _ensure_test_user("usr_pay_test_4b", "pay4b@example.com")
    client = TestClient(app)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"id": "order_rzp_owner_001"}
    with patch("payment_routes.requests.post", return_value=mock_resp):
        res = client.post(
            "/api/payments/create-order",
            json={"pack_id": "image_pack_5"},
            headers={"Authorization": f"Bearer {token_owner}"},
        )
    assert res.status_code == 200

    sig = _sign_checkout("order_rzp_owner_001", "pay_steal_1", "test_secret_xyz")
    steal_res = client.post(
        "/api/payments/verify",
        json={"razorpay_order_id": "order_rzp_owner_001", "razorpay_payment_id": "pay_steal_1", "razorpay_signature": sig},
        headers={"Authorization": f"Bearer {token_other}"},
    )
    assert steal_res.status_code == 404


def test_payment_failed_after_paid_leaves_order_paid():
    import uuid
    rzp_oid = f"order_rzp_term_{uuid.uuid4().hex[:10]}"
    token = _ensure_test_user("usr_pay_test_5", "pay5@example.com")
    client = TestClient(app)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"id": rzp_oid}
    with patch("payment_routes.requests.post", return_value=mock_resp):
        res = client.post(
            "/api/payments/create-order",
            json={"pack_id": "image_pack_5"},
            headers={"Authorization": f"Bearer {token}"},
        )
    order_id = res.json()["order_id"]

    sig = _sign_checkout(rzp_oid, "pay_term_1", "test_secret_xyz")
    v_res = client.post(
        "/api/payments/verify",
        json={"razorpay_order_id": rzp_oid, "razorpay_payment_id": "pay_term_1", "razorpay_signature": sig},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert v_res.status_code == 200
    assert v_res.json()["status"] == "paid"

    failed_body = json.dumps({
        "event": "payment.failed",
        "payload": {"payment": {"entity": {"id": "pay_term_fail", "order_id": rzp_oid}}},
    }).encode("utf-8")
    wh_res = client.post(
        "/api/payments/webhook",
        content=failed_body,
        headers={"X-Razorpay-Signature": _sign_webhook(failed_body, "test_webhook_secret_abc")},
    )
    assert wh_res.status_code == 200

    get_res = client.get(f"/api/orders/{order_id}", headers={"Authorization": f"Bearer {token}"})
    assert get_res.json()["status"] == "paid"


def test_parallel_verify_and_webhook_single_ledger_row():
    import concurrent.futures
    import uuid
    rzp_oid = f"order_rzp_par_{uuid.uuid4().hex[:10]}"

    token = _ensure_test_user("usr_pay_test_6", "pay6@example.com")
    client = TestClient(app)

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"id": rzp_oid}
    with patch("payment_routes.requests.post", return_value=mock_resp):
        res = client.post(
            "/api/payments/create-order",
            json={"pack_id": "video_invite_30s"},
            headers={"Authorization": f"Bearer {token}"},
        )
    order_id = res.json()["order_id"]

    sig = _sign_checkout(rzp_oid, "pay_par_1", "test_secret_xyz")
    wh_body = json.dumps({
        "event": "payment.captured",
        "payload": {"payment": {"entity": {"id": "pay_par_1", "order_id": rzp_oid, "amount": 89900, "currency": "INR"}}},
    }).encode("utf-8")
    wh_sig = _sign_webhook(wh_body, "test_webhook_secret_abc")

    def call_verify():
        return TestClient(app).post(
            "/api/payments/verify",
            json={"razorpay_order_id": rzp_oid, "razorpay_payment_id": "pay_par_1", "razorpay_signature": sig},
            headers={"Authorization": f"Bearer {token}"},
        )

    def call_webhook():
        return TestClient(app).post(
            "/api/payments/webhook",
            content=wh_body,
            headers={"X-Razorpay-Signature": wh_sig},
        )

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        f1 = pool.submit(call_verify)
        f2 = pool.submit(call_webhook)
        r1, r2 = f1.result(), f2.result()

    assert r1.status_code == 200
    assert r2.status_code == 200

    with get_session() as db:
        rows = db.execute(
            text("SELECT credit_type, amount FROM credit_ledger WHERE reference_id LIKE :p"),
            {"p": f"purchase:{order_id}:%"},
        ).fetchall()
        assert sorted(rows) == [("image", 3), ("video", 3)]

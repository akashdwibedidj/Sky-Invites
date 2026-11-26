"""
Credits ledger operations, atomic spend/refund, free-tier grant, and stuck-job sweep.
All ledger operations are strictly append-only.
"""

from datetime import datetime, timedelta, timezone
import logging
from typing import Any, Optional

from sqlalchemy import func, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from db import CreditLedger, Invitation, Scene, User, get_session
from pricing_config import FREE_TIER_CREDITS, GENERATION_TIMEOUT_MINUTES

logger = logging.getLogger(__name__)


class InsufficientCreditsError(Exception):
    def __init__(self, credit_type: str, needed: int, available: int) -> None:
        self.credit_type = credit_type
        self.needed = needed
        self.available = available
        super().__init__(
            f"Insufficient {credit_type} credits: need {needed}, have {available}"
        )


def get_balances(session: Session, user_id: str) -> dict[str, int]:
    """Compute current image and video balances from the append-only ledger."""
    rows = (
        session.query(CreditLedger.credit_type, func.coalesce(func.sum(CreditLedger.amount), 0))
        .filter(CreditLedger.user_id == user_id)
        .group_by(CreditLedger.credit_type)
        .all()
    )
    balances = {"image": 0, "video": 0}
    for ctype, total in rows:
        if ctype in balances:
            balances[ctype] = int(total or 0)
    return balances


def get_user_credits_summary(user_id: str, limit: int = 30) -> dict[str, Any]:
    """Return balances and recent ledger history for a user."""
    with get_session() as session:
        balances = get_balances(session, user_id)
        entries = (
            session.query(CreditLedger)
            .filter(CreditLedger.user_id == user_id)
            .order_by(CreditLedger.created_at.desc(), CreditLedger.id.desc())
            .limit(limit)
            .all()
        )
        history = [
            {
                "id": e.id,
                "credit_type": e.credit_type,
                "amount": e.amount,
                "reason": e.reason,
                "invitation_id": e.invitation_id,
                "scene_index": e.scene_index,
                "note": e.note,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in entries
        ]
        return {"balances": balances, "history": history}


def record_ledger_entry(
    session: Session,
    *,
    user_id: str,
    credit_type: str,
    amount: int,
    reason: str,
    reference_id: str,
    invitation_id: Optional[str] = None,
    scene_index: Optional[int] = None,
    note: Optional[str] = None,
) -> bool:
    """Insert an append-only ledger row idempotently. Returns True if inserted."""
    stmt = (
        pg_insert(CreditLedger)
        .values(
            user_id=user_id,
            credit_type=credit_type,
            amount=amount,
            reason=reason,
            invitation_id=invitation_id,
            scene_index=scene_index,
            reference_id=reference_id,
            note=note,
        )
        .on_conflict_do_nothing(index_elements=["reference_id"])
        .returning(CreditLedger.id)
    )
    return session.execute(stmt).first() is not None


def grant_free_tier_credits(user_id: str, session: Optional[Session] = None) -> bool:
    """Grant the one-time free-tier image credits to a user. Idempotent."""
    free_images = int(FREE_TIER_CREDITS.get("image", 0))
    if free_images <= 0:
        return False

    def _do_grant(s: Session) -> bool:
        return record_ledger_entry(
            s,
            user_id=user_id,
            credit_type="image",
            amount=free_images,
            reason="free_grant",
            reference_id=f"free_grant:{user_id}",
            note="Free tier grant",
        )

    if session is not None:
        return _do_grant(session)
    with get_session() as s:
        return _do_grant(s)


def lock_user_and_spend(
    session: Session,
    *,
    user_id: str,
    credit_type: str,
    cost: int,
    reference_id: str,
    invitation_id: Optional[str] = None,
    scene_index: Optional[int] = None,
    note: Optional[str] = None,
) -> None:
    """
    Lock the user row FOR UPDATE, verify balance >= cost, and insert spend row.
    Must be called inside an active DB transaction.
    """
    if cost <= 0:
        return
    # Serialize concurrent spends for the same user
    session.query(User).filter(User.id == user_id).with_for_update().one()
    balances = get_balances(session, user_id)
    available = balances.get(credit_type, 0)
    if available < cost:
        raise InsufficientCreditsError(credit_type, cost, available)
    inserted = record_ledger_entry(
        session,
        user_id=user_id,
        credit_type=credit_type,
        amount=-cost,
        reason="spend",
        reference_id=reference_id,
        invitation_id=invitation_id,
        scene_index=scene_index,
        note=note,
    )
    if not inserted:
        raise RuntimeError(f"Duplicate spend reference_id: {reference_id}")


def refund_scene_spend(session: Session, scene_row: Scene, user_id: Optional[str]) -> bool:
    """
    Refund the exact spend recorded on scene_row.last_spend_ref, if any.
    Uses reference_id = f'refund:{spend_ref}' with ON CONFLICT DO NOTHING.
    """
    spend_ref = getattr(scene_row, "last_spend_ref", None)
    if not spend_ref or not user_id:
        return False

    spend_entry = (
        session.query(CreditLedger)
        .filter(CreditLedger.reference_id == spend_ref, CreditLedger.reason == "spend")
        .first()
    )
    if not spend_entry or spend_entry.amount >= 0:
        return False

    refund_amount = abs(int(spend_entry.amount))
    return record_ledger_entry(
        session,
        user_id=user_id,
        credit_type=spend_entry.credit_type,
        amount=refund_amount,
        reason="refund",
        reference_id=f"refund:{spend_ref}",
        invitation_id=scene_row.invitation_id,
        scene_index=scene_row.scene_index,
        note="Automatic refund for failed generation",
    )


def sweep_stuck_generating_scenes(timeout_minutes: int = GENERATION_TIMEOUT_MINUTES) -> int:
    """
    Mark scenes stuck in 'generating' longer than timeout_minutes as 'failed'
    and idempotently refund their last_spend_ref.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=timeout_minutes)
    swept = 0
    with get_session() as session:
        stuck_rows = (
            session.query(Scene)
            .filter(
                Scene.status == "generating",
                Scene.generating_started_at.isnot(None),
                Scene.generating_started_at < cutoff,
            )
            .with_for_update(skip_locked=True)
            .all()
        )
        for scene_row in stuck_rows:
            inv = (
                session.query(Invitation)
                .filter(Invitation.id == scene_row.invitation_id)
                .first()
            )
            user_id = inv.user_id if inv else None
            refund_scene_spend(session, scene_row, user_id)
            scene_row.status = "failed"
            scene_row.generating_started_at = None
            swept += 1
    if swept:
        logger.warning(f"Startup sweep marked {swept} stuck generating card(s) as failed and refunded.")
    return swept

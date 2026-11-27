"""Tests for credits, ledger, atomic spending, parallel requests, and refunds."""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import sys
from pathlib import Path
import uuid

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from credits import (
    get_balances,
    get_user_credits_summary,
    grant_free_tier_credits,
    record_ledger_entry,
    sweep_stuck_generating_scenes,
)
from db import Invitation, Scene, User, create_tables, get_session
from storage import release_image_generation, try_claim_initial_image_generation


def _create_test_user(prefix: str = "u") -> str:
    uid = f"{prefix}_{uuid.uuid4().hex[:10]}"
    with get_session() as session:
        session.add(
            User(
                id=uid,
                email=f"{uid}@test.local",
                name="Test User",
                account_type="individual",
            )
        )
    return uid


def _create_test_invitation(user_id: str, num_scenes: int = 2) -> str:
    inv_id = f"inv_{uuid.uuid4().hex[:10]}"
    with get_session() as session:
        session.add(
            Invitation(
                id=inv_id,
                user_id=user_id,
                type="wedding",
                user_input={"title": "Test"},
                status="pending",
            )
        )
        for i in range(num_scenes):
            session.add(
                Scene(
                    invitation_id=inv_id,
                    scene_index=i,
                    status="pending",
                )
            )
    return inv_id


def test_free_grant_once_and_user_isolation():
    create_tables()
    u1 = _create_test_user("u1")
    u2 = _create_test_user("u2")

    assert grant_free_tier_credits(u1) is True
    assert grant_free_tier_credits(u1) is False  # idempotent

    s1 = get_user_credits_summary(u1)
    s2 = get_user_credits_summary(u2)
    assert s1["balances"]["image"] == 2
    assert s2["balances"]["image"] == 0
    assert len(s1["history"]) == 1
    assert len(s2["history"]) == 0


def test_parallel_spend_only_one_succeeds():
    create_tables()
    uid = _create_test_user("par")
    inv_id = _create_test_invitation(uid, num_scenes=2)
    with get_session() as session:
        record_ledger_entry(
            session,
            user_id=uid,
            credit_type="image",
            amount=1,
            reason="admin_grant",
            reference_id=f"grant:{uid}:1",
        )

    def _attempt(idx: int):
        return try_claim_initial_image_generation(inv_id, idx, user_id=uid, credit_cost=1)

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(_attempt, [0, 1]))

    successes = [r for r in results if r[0] is True]
    failures = [r for r in results if r[0] is False]
    assert len(successes) == 1
    assert len(failures) == 1
    assert failures[0][1] == 402
    assert failures[0][2] == "INSUFFICIENT_CREDITS"

    with get_session() as session:
        assert get_balances(session, uid)["image"] == 0


def test_failed_job_refund_and_idempotency():
    create_tables()
    uid = _create_test_user("ref")
    inv_id = _create_test_invitation(uid, num_scenes=1)
    with get_session() as session:
        record_ledger_entry(
            session,
            user_id=uid,
            credit_type="image",
            amount=1,
            reason="admin_grant",
            reference_id=f"grant:{uid}:1",
        )

    claimed, _, _, _ = try_claim_initial_image_generation(inv_id, 0, user_id=uid, credit_cost=1)
    assert claimed is True
    with get_session() as session:
        assert get_balances(session, uid)["image"] == 0

    release_image_generation(inv_id, 0, restore_status="failed")
    # Second release must not double-refund
    release_image_generation(inv_id, 0, restore_status="failed")
    with get_session() as session:
        assert get_balances(session, uid)["image"] == 1


def test_startup_sweep_refunds_stuck_scene():
    create_tables()
    uid = _create_test_user("swp")
    inv_id = _create_test_invitation(uid, num_scenes=1)
    with get_session() as session:
        record_ledger_entry(
            session,
            user_id=uid,
            credit_type="image",
            amount=1,
            reason="admin_grant",
            reference_id=f"grant:{uid}:1",
        )

    claimed, _, _, _ = try_claim_initial_image_generation(inv_id, 0, user_id=uid, credit_cost=1)
    assert claimed is True

    # Backdate generating_started_at to 20 minutes ago
    with get_session() as session:
        sc = session.query(Scene).filter(Scene.invitation_id == inv_id, Scene.scene_index == 0).one()
        sc.generating_started_at = datetime.now(timezone.utc) - timedelta(minutes=20)

    swept = sweep_stuck_generating_scenes(timeout_minutes=15)
    assert swept >= 1
    with get_session() as session:
        assert get_balances(session, uid)["image"] == 1
        sc = session.query(Scene).filter(Scene.invitation_id == inv_id, Scene.scene_index == 0).one()
        assert sc.status == "failed"

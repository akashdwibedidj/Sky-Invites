"""Security, rate-limit, timeout-refund, and production-config tests."""

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

import api
import auth
import credits
import db
import storage


def _make_user(user_id: str, email: str, password_hash: str = "x") -> str:
    with db.get_session() as session:
        u = db.User(id=user_id, email=email, name="Sec Test", password_hash=password_hash)
        session.add(u)
        session.flush()
    return auth.create_access_token(user_id=user_id)


def test_id_validation_and_path_traversal_rejected(tmp_path):
    with pytest.raises(ValueError):
        storage.validate_invitation_id("../etc/passwd")
    with pytest.raises(ValueError):
        storage.validate_invitation_id("abc/def")
    with pytest.raises(ValueError):
        storage.invitation_dir("..")

    token = _make_user("usr_sec_1", "sec1@example.com")
    client = TestClient(api.app)

    res = client.get(
        "/api/invitations/..%2F..%2Fetc",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code in (400, 404)

    res2 = client.post(
        "/api/generate-images",
        json={"invitation_id": "../bad", "story_driven": False},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res2.status_code == 422
    assert not (storage.MEDIA_DIR / "bad").exists()
    assert not (storage.MEDIA_DIR.parent / "bad").exists()


def test_orphan_claim_rejected():
    token = _make_user("usr_sec_orphan", "orphan@example.com")
    orphan_id = "orphan_inv_001"
    with db.get_session() as session:
        session.add(db.Invitation(id=orphan_id, user_id=None, user_input={"type": "wedding"}))
        session.flush()

    client = TestClient(api.app)
    with patch("api.run_create_scenes_task"):
        res = client.post(
            "/api/create-scenes",
            json={"invitation": {"id": orphan_id, "type": "wedding", "title": "Test"}},
            headers={"Authorization": f"Bearer {token}"},
        )
    assert res.status_code == 202
    assert res.json()["invitation_id"] != orphan_id

    with db.get_session() as session:
        inv = session.query(db.Invitation).filter(db.Invitation.id == orphan_id).first()
        assert inv is not None
        assert inv.user_id is None


def test_password_length_signup_and_existing_login():
    client = TestClient(api.app)

    # Too short (< 8)
    r_short = client.post(
        "/api/auth/signup",
        json={"name": "A", "email": "short@example.com", "password": "1234567"},
    )
    assert r_short.status_code == 422

    # Too long (> 128)
    r_long = client.post(
        "/api/auth/signup",
        json={"name": "A", "email": "long@example.com", "password": "x" * 129},
    )
    assert r_long.status_code == 422

    # Valid signup (8 chars)
    r_ok = client.post(
        "/api/auth/signup",
        json={"name": "Valid User", "email": "valid8@example.com", "password": "password1"},
    )
    assert r_ok.status_code == 200

    # Existing user with legacy 6-char password can still log in
    legacy_hash = auth.hash_password("legacy")
    _make_user("usr_legacy_6", "legacy6@example.com", password_hash=legacy_hash)
    r_login = client.post(
        "/api/auth/login",
        json={"email": "legacy6@example.com", "password": "legacy"},
    )
    assert r_login.status_code == 200


def test_daily_invitation_cap_and_google_rate_limit():
    token = _make_user("usr_sec_cap", "cap@example.com")
    client = TestClient(api.app)

    with patch("api.run_create_scenes_task"):
        for i in range(5):
            r = client.post(
                "/api/create-scenes",
                json={"invitation": {"type": "wedding", "title": f"Inv {i}"}},
                headers={"Authorization": f"Bearer {token}"},
            )
            assert r.status_code == 202

        r_cap = client.post(
            "/api/create-scenes",
            json={"invitation": {"type": "wedding", "title": "Inv over cap"}},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert r_cap.status_code == 429

    # Google auth rate limit (10/minute)
    with patch("auth_routes.verify_google_id_token", return_value=None):
        statuses = [
            client.post("/api/auth/google", json={"idToken": "bad"}).status_code
            for _ in range(11)
        ]
    assert 429 in statuses


def test_production_startup_checks(monkeypatch):
    monkeypatch.setattr(api, "IS_PRODUCTION", True)
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    monkeypatch.setenv("XAI_API_KEY", "xai-test")
    monkeypatch.setenv("FRONTEND_ORIGIN", "http://localhost:3000")
    monkeypatch.setenv("JWT_SECRET_KEY", "a" * 32)
    monkeypatch.setenv("MEDIA_SIGNING_SECRET", "b" * 32)
    monkeypatch.setenv("DATABASE_URL", db.os.environ["DATABASE_URL"])

    with pytest.raises(RuntimeError, match="FRONTEND_ORIGIN"):
        api.validate_startup_config()

    monkeypatch.setenv("FRONTEND_ORIGIN", "https://www.skyinvites.in")
    monkeypatch.setenv("JWT_SECRET_KEY", "short")
    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY"):
        api.validate_startup_config()

    monkeypatch.setenv("JWT_SECRET_KEY", "a" * 32)
    monkeypatch.setenv("MEDIA_SIGNING_SECRET", "placeholder-secret-value-1234567890")
    with pytest.raises(RuntimeError, match="MEDIA_SIGNING_SECRET"):
        api.validate_startup_config()

    monkeypatch.setenv("MEDIA_SIGNING_SECRET", "b" * 32)
    monkeypatch.delenv("DATABASE_URL", raising=False)
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        api.validate_startup_config()

    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://u:p@localhost/test_db")
    with patch("api.shutil.which", return_value=None):
        with pytest.raises(RuntimeError, match="ffmpeg"):
            api.validate_startup_config()

    with patch("api.shutil.which", return_value="/usr/bin/ffmpeg"), patch("pathlib.Path.is_file", return_value=False):
        with pytest.raises(RuntimeError, match="Missing required font file"):
            api.validate_startup_config()


def test_timed_out_generation_is_refunded_and_not_left_stuck():
    uid = "usr_sec_timeout"
    _make_user(uid, "timeout@example.com")
    credits.grant_free_tier_credits(uid)

    inv_id = "inv_timeout_001"
    with db.get_session() as session:
        session.add(db.Invitation(id=inv_id, user_id=uid, user_input={"type": "wedding"}))
        session.add(
            db.Scene(
                invitation_id=inv_id,
                scene_index=0,
                status="generating",
                generating_started_at=datetime.now(timezone.utc) - timedelta(minutes=60),
                last_spend_ref="spend:timeout:001",
            )
        )
        credits.record_ledger_entry(
            session,
            user_id=uid,
            credit_type="image",
            amount=-1,
            reason="spend",
            reference_id="spend:timeout:001",
        )
        session.flush()

    swept = credits.sweep_stuck_generating_scenes(timeout_minutes=15)
    assert swept >= 1

    with db.get_session() as session:
        sc = session.query(db.Scene).filter(db.Scene.invitation_id == inv_id, db.Scene.scene_index == 0).first()
        assert sc.status == "failed"
        assert sc.generating_started_at is None
        bal = credits.get_balances(session, uid)["image"]
        assert bal == 2  # refunded back to initial 2


def test_analyze_image_daily_cap_and_create_scenes_rerun_cap():
    uid = "usr_sec_caps_2"
    token = _make_user(uid, "caps2@example.com")
    inv_id = "inv_rerun_001"
    with db.get_session() as session:
        session.add(db.Invitation(id=inv_id, user_id=uid, user_input={"type": "wedding"}, create_scenes_count=3))
        session.add(db.Scene(invitation_id=inv_id, scene_index=0, status="done"))
        for _ in range(60):
            session.add(db.ApiUsageEvent(user_id=uid, endpoint="analyze-image"))
        session.flush()

    storage.invitation_dir(inv_id).mkdir(parents=True, exist_ok=True)
    client = TestClient(api.app)

    r_rerun = client.post(
        "/api/create-scenes",
        json={"invitation": {"id": inv_id, "type": "wedding", "title": "Rerun"}},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r_rerun.status_code == 429

    r_analyze = client.post(
        "/api/analyze-image",
        json={"invitation_id": inv_id, "scene_index": 0},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r_analyze.status_code == 429


"""Tests for public lead capture endpoints: waitlist, contact, business enquiry."""

import os
import sys
from pathlib import Path
from unittest.mock import patch

from dotenv import load_dotenv
from fastapi.testclient import TestClient

_BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_BACKEND_DIR))
load_dotenv(_BACKEND_DIR / ".env")

import api  # noqa: E402
from db import create_tables, get_session  # noqa: E402
from sqlalchemy import text  # noqa: E402

create_tables()
client = TestClient(api.app)


def _cleanup_test_email(email: str) -> None:
    with get_session() as db:
        db.execute(text("DELETE FROM waitlist WHERE LOWER(email) = LOWER(:e)"), {"e": email})
        db.execute(text("DELETE FROM contact_messages WHERE LOWER(email) = LOWER(:e)"), {"e": email})
        db.execute(text("DELETE FROM business_enquiries WHERE LOWER(email) = LOWER(:e)"), {"e": email})


def test_waitlist_duplicate_email_case_insensitive():
    test_email = "TestLead_Dup@Example.com"
    _cleanup_test_email(test_email)
    try:
        r1 = client.post(
            "/api/waitlist",
            json={"name": "Asha", "email": test_email, "eventType": "Wedding"},
        )
        r2 = client.post(
            "/api/waitlist",
            json={"name": "Asha", "email": test_email.lower(), "eventType": "Wedding"},
        )
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r1.json() == r2.json()
        assert r1.json()["success"] is True

        with get_session() as db:
            count = db.execute(
                text("SELECT COUNT(*) FROM waitlist WHERE LOWER(email) = LOWER(:e)"),
                {"e": test_email},
            ).scalar()
            assert count == 1
    finally:
        _cleanup_test_email(test_email)


def test_honeypot_returns_success_and_writes_nothing():
    test_email = "honeypot_bot@example.com"
    _cleanup_test_email(test_email)
    try:
        r = client.post(
            "/api/contact",
            json={
                "name": "Bot",
                "email": test_email,
                "subject": "Spam",
                "message": "Buy now",
                "website": "https://spam.example",
            },
        )
        assert r.status_code == 200
        assert r.json()["success"] is True

        with get_session() as db:
            count = db.execute(
                text("SELECT COUNT(*) FROM contact_messages WHERE LOWER(email) = LOWER(:e)"),
                {"e": test_email},
            ).scalar()
            assert count == 0
    finally:
        _cleanup_test_email(test_email)


def test_oversized_fields_rejected():
    r = client.post(
        "/api/business/enquiry",
        json={
            "businessName": "A" * 201,
            "contactName": "B",
            "workEmail": "valid@example.com",
            "businessType": "Wedding Planner",
            "monthlyVolume": "10-50",
            "message": "Hello",
        },
    )
    assert r.status_code == 422


def test_rate_limit_returns_429():
    import leads_routes
    leads_routes.limiter.reset()
    statuses = []
    for i in range(6):
        r = client.post(
            "/api/waitlist",
            json={
                "name": "Rate Test",
                "email": f"ratelimit_{i}@example.com",
                "eventType": "Wedding",
                "website": "honeypot-skip-db",
            },
        )
        statuses.append(r.status_code)
    assert statuses[:5] == [200, 200, 200, 200, 200]
    assert statuses[5] == 429

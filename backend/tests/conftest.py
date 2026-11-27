import os
import sys
from pathlib import Path
from urllib.parse import urlparse

import pytest

TESTS_DIR = Path(__file__).resolve().parent
BACKEND_DIR = TESTS_DIR.parent
if str(TESTS_DIR) not in sys.path:
    sys.path.insert(0, str(TESTS_DIR))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def _validate_test_db_url() -> str:
    test_url = os.environ.get("TEST_DATABASE_URL", "").strip()
    dev_url = os.environ.get("DATABASE_URL", "").strip()

    if not test_url:
        raise RuntimeError(
            "TEST_DATABASE_URL must be set to run pytest (never run tests against the dev database)."
        )
    if dev_url and test_url == dev_url:
        raise RuntimeError("TEST_DATABASE_URL must not equal DATABASE_URL.")

    db_name = urlparse(test_url).path.lstrip("/").lower()
    if "test" not in db_name:
        raise RuntimeError(
            f"TEST_DATABASE_URL database name ({db_name!r}) must contain 'test' for safety."
        )
    return test_url


_TEST_DB_URL = _validate_test_db_url()
os.environ["DATABASE_URL"] = _TEST_DB_URL
os.environ.setdefault("APP_ENV", "development")

import db  # noqa: E402
import storage  # noqa: E402
import api  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _setup_test_db():
    db.create_tables()
    yield


@pytest.fixture(autouse=True)
def _isolated_media_and_clean_db(tmp_path, monkeypatch):
    media_dir = tmp_path / "media"
    media_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(storage, "MEDIA_DIR", media_dir)
    monkeypatch.setattr(api, "MEDIA_DIR", media_dir)

    with db.get_session() as session:
        for table in reversed(db.Base.metadata.sorted_tables):
            session.execute(table.delete())
    yield

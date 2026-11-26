import os
from contextlib import contextmanager
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    create_engine,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, sessionmaker

# Load .env if present
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(ENV_PATH, override=True)
PROJECT_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(PROJECT_ENV_PATH, override=True)

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(Text, nullable=True)
    google_id = Column(String(128), unique=True, nullable=True)
    name = Column(String(255), nullable=False)
    account_type = Column(String(20), nullable=False, server_default="individual")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(String(64), primary_key=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    type = Column(String(50), nullable=True)
    user_input = Column(JSONB, nullable=False)
    style_bible = Column(JSONB, nullable=True)
    status = Column(String(50), nullable=True, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Scene(Base):
    __tablename__ = "scenes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    invitation_id = Column(String(64), ForeignKey("invitations.id", ondelete="CASCADE"), nullable=False)
    scene_index = Column(Integer, nullable=False)
    scene_purpose = Column(Text, nullable=True)
    text_data = Column(JSONB, nullable=True)
    image_prompt = Column(Text, nullable=True)
    image_path = Column(String(512), nullable=True)
    text_blocks = Column(JSONB, nullable=True)
    text_layer = Column(JSONB, nullable=True)
    video_prompt = Column(Text, nullable=True)
    animation_note = Column(Text, nullable=True)
    animation_plan = Column(JSONB, nullable=True)
    video_path = Column(String(512), nullable=True)
    status = Column(String(50), nullable=True, default="pending")
    image_generations = Column(Integer, nullable=False, server_default="0", default=0)
    video_generations = Column(Integer, nullable=False, server_default="0", default=0)
    analyzed = Column(Boolean, nullable=False, server_default="false", default=False)
    last_spend_ref = Column(String(128), nullable=True)
    generating_started_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("invitation_id", "scene_index", name="uq_invitation_scene_index"),
    )


# APPEND-ONLY: Never update or delete rows in credit_ledger. All adjustments are new rows.
class CreditLedger(Base):
    __tablename__ = "credit_ledger"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    credit_type = Column(String(16), nullable=False)  # "image" | "video"
    amount = Column(Integer, nullable=False)          # + for grants/purchases/refunds, - for spends
    reason = Column(String(32), nullable=False)       # "purchase" | "spend" | "refund" | "free_grant" | "admin_grant"
    invitation_id = Column(String(64), nullable=True)
    scene_index = Column(Integer, nullable=True)
    reference_id = Column(String(128), unique=True, nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Order(Base):
    __tablename__ = "orders"

    id = Column(String(64), primary_key=True)
    user_id = Column(String(64), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    pack_id = Column(String(64), nullable=False)
    amount_paise = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, default="created")  # "created" | "paid" | "failed"
    gateway_order_id = Column(String(128), nullable=True)
    gateway_payment_id = Column(String(128), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


_engine = None
_SessionLocal = None


def _get_engine():
    global _engine, _SessionLocal
    if _engine is None:
        url = os.environ.get("DATABASE_URL")
        if not url:
            raise ValueError("DATABASE_URL environment variable is not set. Please set it in .env")
        _engine = create_engine(url)
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    return _engine


@contextmanager
def get_session():
    _get_engine()
    session = _SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def create_tables() -> None:
    eng = _get_engine()
    Base.metadata.create_all(bind=eng)
    # Idempotent migrations
    with eng.begin() as conn:
        # Plan 2: generation counters + analyzed flag
        conn.execute(text("ALTER TABLE scenes ADD COLUMN IF NOT EXISTS image_generations INTEGER NOT NULL DEFAULT 0"))
        conn.execute(text("ALTER TABLE scenes ADD COLUMN IF NOT EXISTS video_generations INTEGER NOT NULL DEFAULT 0"))
        conn.execute(text("ALTER TABLE scenes ADD COLUMN IF NOT EXISTS analyzed BOOLEAN NOT NULL DEFAULT FALSE"))
        # Plan 4: user_id on invitations (nullable — existing rows stay NULL/orphaned)
        conn.execute(text("ALTER TABLE invitations ADD COLUMN IF NOT EXISTS user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL"))
        # Credits & ledger: spend reference & timeout tracking on scenes
        conn.execute(text("ALTER TABLE scenes ADD COLUMN IF NOT EXISTS last_spend_ref VARCHAR(128)"))
        conn.execute(text("ALTER TABLE scenes ADD COLUMN IF NOT EXISTS generating_started_at TIMESTAMPTZ"))
        # One-time idempotent free grant backfill for existing users
        conn.execute(text(
            "INSERT INTO credit_ledger (user_id, credit_type, amount, reason, reference_id, note) "
            "SELECT id, 'image', 2, 'free_grant', 'free_grant:' || id, 'Free tier grant' "
            "FROM users ON CONFLICT (reference_id) DO NOTHING"
        ))
        # Backfill counters for already-generated media
        conn.execute(text("UPDATE scenes SET image_generations = 1 WHERE image_path IS NOT NULL AND image_generations = 0"))
        conn.execute(text("UPDATE scenes SET video_generations = 1 WHERE video_path IS NOT NULL AND video_generations = 0"))
        conn.execute(text(
            "UPDATE scenes SET analyzed = TRUE "
            "WHERE animation_plan IS NOT NULL "
            "AND (animation_plan->'objectsDetected') IS NOT NULL "
            "AND jsonb_typeof(animation_plan->'objectsDetected') = 'array' "
            "AND jsonb_array_length(animation_plan->'objectsDetected') > 0 "
            "AND analyzed = FALSE"
        ))

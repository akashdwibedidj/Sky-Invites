import os
from contextlib import contextmanager
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    create_engine,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, sessionmaker

# Load .env if present
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(ENV_PATH, override=True)
PROJECT_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(PROJECT_ENV_PATH, override=True)

Base = declarative_base()


class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(String(64), primary_key=True)
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

    __table_args__ = (
        UniqueConstraint("invitation_id", "scene_index", name="uq_invitation_scene_index"),
    )


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

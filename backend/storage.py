# ─────────────────────────────────────────────────────────────────────────────
# storage.py  –  All reading and writing of state.json and file paths.
# Replace this file when you move to a database; nothing else changes.
# ─────────────────────────────────────────────────────────────────────────────

import json
from pathlib import Path

# Project root is one directory above this file (backend/ → project root)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
MEDIA_DIR = PROJECT_ROOT / "media"


# ── Path helpers ──────────────────────────────────────────────────────────────

def invitation_dir(invitation_id: str) -> Path:
    return MEDIA_DIR / invitation_id


def state_path(invitation_id: str) -> Path:
    return invitation_dir(invitation_id) / "state.json"


def image_path(invitation_id: str, scene_index: int) -> Path:
    return invitation_dir(invitation_id) / f"scene_{scene_index}.png"


def video_path(invitation_id: str, scene_index: int) -> Path:
    return invitation_dir(invitation_id) / f"scene_{scene_index}.mp4"


def rel(path: Path) -> str:
    """Return path relative to project root, with forward slashes."""
    return path.relative_to(PROJECT_ROOT).as_posix()


# ── State read / write ────────────────────────────────────────────────────────

def create_invitation(invitation_id: str, input_data: dict) -> dict:
    """Create the media folder and an initial state.json. Return the state."""
    folder = invitation_dir(invitation_id)
    folder.mkdir(parents=True, exist_ok=True)

    state = {
        "invitation_id": invitation_id,
        "input": input_data,
        "style_bible": None,
        "scenes": [],
    }
    _write(invitation_id, state)
    return state


def load_state(invitation_id: str) -> dict:
    path = state_path(invitation_id)
    if not path.exists():
        raise FileNotFoundError(f"state.json not found for invitation '{invitation_id}'")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_state(invitation_id: str, state: dict) -> None:
    _write(invitation_id, state)


# ── Internal ──────────────────────────────────────────────────────────────────

def _write(invitation_id: str, state: dict) -> None:
    with open(state_path(invitation_id), "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2, ensure_ascii=False)

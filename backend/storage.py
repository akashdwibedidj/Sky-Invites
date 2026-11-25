# ─────────────────────────────────────────────────────────────────────────────
# storage.py  –  PostgreSQL storage layer for invitations and scenes.
# Generated images and videos stay on disk in media/<invitation_id>/.
# ─────────────────────────────────────────────────────────────────────────────

from pathlib import Path
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert

from db import Invitation, Scene, get_session

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
    """Create the media folder and an initial invitation row in PostgreSQL. Return state."""
    folder = invitation_dir(invitation_id)
    folder.mkdir(parents=True, exist_ok=True)

    state = {
        "invitation_id": invitation_id,
        "input": input_data,
        "style_bible": None,
        "status": "pending",
        "scenes": [],
    }
    save_state(invitation_id, state)
    return state


def load_state(invitation_id: str) -> dict:
    """Load invitation and scenes from PostgreSQL into the state dictionary."""
    with get_session() as session:
        inv = session.query(Invitation).filter(Invitation.id == invitation_id).first()
        if not inv:
            raise FileNotFoundError(f"State not found for invitation '{invitation_id}'")

        scenes = (
            session.query(Scene)
            .filter(Scene.invitation_id == invitation_id)
            .order_by(Scene.scene_index.asc())
            .all()
        )

        scenes_list = []
        for s in scenes:
            scene_dict = {
                "scene_index": s.scene_index,
            }
            if s.scene_purpose is not None:
                scene_dict["scene_purpose"] = s.scene_purpose
            if s.text_data is not None:
                scene_dict["text_data"] = s.text_data
            if s.image_prompt is not None:
                scene_dict["image_prompt"] = s.image_prompt
            if s.image_path is not None:
                scene_dict["image_path"] = s.image_path
            if s.text_blocks is not None:
                scene_dict["text_blocks"] = s.text_blocks
            if s.text_layer is not None:
                scene_dict["text_layer"] = s.text_layer
            if s.video_prompt is not None:
                scene_dict["video_prompt"] = s.video_prompt
            if s.animation_note is not None:
                scene_dict["animation_note"] = s.animation_note
            if s.animation_plan is not None:
                scene_dict["animation_plan"] = s.animation_plan
            if s.video_path is not None:
                scene_dict["video_path"] = s.video_path
            if s.status is not None:
                scene_dict["status"] = s.status
            scene_dict["image_generations"] = s.image_generations or 0
            scene_dict["video_generations"] = s.video_generations or 0
            scene_dict["analyzed"] = bool(s.analyzed)
            scenes_list.append(scene_dict)

        state = {
            "invitation_id": inv.id,
            "input": inv.user_input,
            "style_bible": inv.style_bible,
            "scenes": scenes_list,
        }
        if inv.status is not None:
            state["status"] = inv.status
        return state


def save_state(invitation_id: str, state: dict) -> None:
    """
    Save state to PostgreSQL:
    1. Upsert invitation row.
    2. Upsert each scene row individually by (invitation_id, scene_index).
       Never deletes and recreates scene rows so parallel node updates are safe.
    """
    with get_session() as session:
        # 1. Upsert invitation
        inv_values = {"id": invitation_id}
        if "input" in state and state["input"] is not None:
            inv_values["user_input"] = state["input"]
            if isinstance(state["input"], dict) and "invitation_type" in state["input"]:
                inv_values["type"] = state["input"]["invitation_type"]
        if "style_bible" in state:
            inv_values["style_bible"] = state["style_bible"]
        if "status" in state and state["status"] is not None:
            inv_values["status"] = state["status"]

        stmt_inv = pg_insert(Invitation).values(**inv_values)
        set_inv = {k: v for k, v in inv_values.items() if k != "id"}
        if set_inv:
            stmt_inv = stmt_inv.on_conflict_do_update(
                index_elements=["id"],
                set_=set_inv,
            )
        else:
            stmt_inv = stmt_inv.on_conflict_do_nothing(index_elements=["id"])
        session.execute(stmt_inv)

        # 2. Upsert each scene row individually
        scenes = state.get("scenes", [])
        for scene in scenes:
            scene_values = {
                "invitation_id": invitation_id,
                "scene_index": scene["scene_index"],
            }
            for col in (
                "scene_purpose",
                "text_data",
                "image_prompt",
                "image_path",
                "text_blocks",
                "text_layer",
                "video_prompt",
                "animation_note",
                "animation_plan",
                "video_path",
                "status",
                "image_generations",
                "video_generations",
                "analyzed",
            ):
                if col in scene:
                    scene_values[col] = scene[col]

            stmt_scene = pg_insert(Scene).values(**scene_values)
            set_scene = {
                k: v
                for k, v in scene_values.items()
                if k not in ("invitation_id", "scene_index")
            }
            if set_scene:
                stmt_scene = stmt_scene.on_conflict_do_update(
                    index_elements=["invitation_id", "scene_index"],
                    set_=set_scene,
                )
            else:
                stmt_scene = stmt_scene.on_conflict_do_nothing(
                    index_elements=["invitation_id", "scene_index"]
                )
            session.execute(stmt_scene)


def update_scene(invitation_id: str, scene_index: int, **fields) -> None:
    """Update specific fields of an individual scene row."""
    with get_session() as session:
        stmt = (
            pg_insert(Scene)
            .values(invitation_id=invitation_id, scene_index=scene_index, **fields)
            .on_conflict_do_update(
                index_elements=["invitation_id", "scene_index"],
                set_=fields,
            )
        )
        session.execute(stmt)


def try_claim_initial_image_generation(
    invitation_id: str, scene_index: int
) -> tuple[bool, int, str | None, str | None]:
    """
    Atomically claim the initial image generation slot (only when image_generations = 0
    and status != 'generating' and image_path IS NULL).
    Returns (claimed, http_status, error_code, detail).
    """
    with get_session() as session:
        row = session.execute(
            text(
                "UPDATE scenes "
                "SET image_generations = image_generations + 1, status = 'generating' "
                "WHERE invitation_id = :inv_id AND scene_index = :idx "
                "AND image_generations = 0 "
                "AND COALESCE(status, 'pending') != 'generating' "
                "AND image_path IS NULL "
                "RETURNING image_generations"
            ),
            {"inv_id": invitation_id, "idx": scene_index},
        ).first()
        if row:
            return True, 200, None, None

        existing = session.execute(
            text(
                "SELECT image_generations, status, image_path FROM scenes "
                "WHERE invitation_id = :inv_id AND scene_index = :idx"
            ),
            {"inv_id": invitation_id, "idx": scene_index},
        ).first()
        if not existing:
            return False, 404, "NOT_FOUND", f"Card {scene_index + 1} not found."
        if existing.status == "generating":
            return False, 409, "IN_PROGRESS", "Image generation is already in progress for this card."
        if existing.image_path is not None or existing.image_generations >= 1:
            return False, 409, "ALREADY_GENERATED", "Image has already been generated for this card."
        return False, 409, "IN_PROGRESS", "Unable to start image generation."


def try_claim_image_regeneration(
    invitation_id: str, scene_index: int, max_limit: int
) -> tuple[bool, int, str | None, str | None]:
    """
    Atomically claim an image regeneration slot (only when 1 <= image_generations < max_limit
    and status != 'generating').
    Returns (claimed, http_status, error_code, detail).
    """
    with get_session() as session:
        row = session.execute(
            text(
                "UPDATE scenes "
                "SET image_generations = image_generations + 1, status = 'generating' "
                "WHERE invitation_id = :inv_id AND scene_index = :idx "
                "AND image_generations >= 1 "
                "AND image_generations < :max_limit "
                "AND COALESCE(status, 'pending') != 'generating' "
                "RETURNING image_generations"
            ),
            {"inv_id": invitation_id, "idx": scene_index, "max_limit": max_limit},
        ).first()
        if row:
            return True, 200, None, None

        existing = session.execute(
            text(
                "SELECT image_generations, status FROM scenes "
                "WHERE invitation_id = :inv_id AND scene_index = :idx"
            ),
            {"inv_id": invitation_id, "idx": scene_index},
        ).first()
        if not existing:
            return False, 404, "NOT_FOUND", f"Card {scene_index + 1} not found."
        if existing.status == "generating":
            return False, 409, "IN_PROGRESS", "Image generation is already in progress for this card."
        if existing.image_generations == 0:
            return False, 400, "NO_INITIAL_IMAGE", "Initial image must be generated first."
        return False, 403, "LIMIT_REACHED", "Image regeneration limit reached (maximum 1 regeneration per card)."


def release_image_generation(
    invitation_id: str, scene_index: int, restore_status: str = "failed"
) -> None:
    """Refund 1 image_generations count when generation fails."""
    with get_session() as session:
        session.execute(
            text(
                "UPDATE scenes "
                "SET image_generations = GREATEST(0, image_generations - 1), status = :st "
                "WHERE invitation_id = :inv_id AND scene_index = :idx"
            ),
            {"inv_id": invitation_id, "idx": scene_index, "st": restore_status},
        )


def try_claim_video_generation(
    invitation_id: str, scene_index: int, max_limit: int
) -> tuple[bool, int, str | None, str | None]:
    """
    Atomically claim a video generation slot (only when video_generations < max_limit
    and videoStatus is not queued/generating).
    Returns (claimed, http_status, error_code, detail).
    """
    with get_session() as session:
        row = session.execute(
            text(
                "UPDATE scenes "
                "SET video_generations = video_generations + 1, "
                "    animation_plan = jsonb_set("
                "        COALESCE(animation_plan, '{}'::jsonb), "
                "        '{videoStatus}', '\"queued\"'::jsonb, true"
                "    ) "
                "WHERE invitation_id = :inv_id AND scene_index = :idx "
                "AND video_generations < :max_limit "
                "AND COALESCE(animation_plan->>'videoStatus', 'idle') NOT IN ('queued', 'generating') "
                "RETURNING video_generations"
            ),
            {"inv_id": invitation_id, "idx": scene_index, "max_limit": max_limit},
        ).first()
        if row:
            return True, 200, None, None

        existing = session.execute(
            text(
                "SELECT video_generations, animation_plan FROM scenes "
                "WHERE invitation_id = :inv_id AND scene_index = :idx"
            ),
            {"inv_id": invitation_id, "idx": scene_index},
        ).first()
        if not existing:
            return False, 404, "NOT_FOUND", f"Card {scene_index + 1} not found."
        plan = existing.animation_plan or {}
        v_status = plan.get("videoStatus", "idle")
        if v_status in ("queued", "generating"):
            return False, 409, "IN_PROGRESS", "Video generation is already in progress for this card."
        return False, 403, "LIMIT_REACHED", "Video generation limit reached (maximum 1 video per card)."


def release_video_generation(invitation_id: str, scene_index: int) -> None:
    """Refund 1 video_generations count when video generation fails."""
    with get_session() as session:
        session.execute(
            text(
                "UPDATE scenes "
                "SET video_generations = GREATEST(0, video_generations - 1), "
                "    animation_plan = jsonb_set("
                "        jsonb_set(COALESCE(animation_plan, '{}'::jsonb), '{videoStatus}', '\"failed\"'::jsonb, true), "
                "        '{videoProgress}', '0'::jsonb, true"
                "    ) "
                "WHERE invitation_id = :inv_id AND scene_index = :idx"
            ),
            {"inv_id": invitation_id, "idx": scene_index},
        )

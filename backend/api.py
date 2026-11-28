"""
api.py – FastAPI backend for Sky Invites.
Exposes endpoints matching services/api.ts shapes.
Plan 4: real auth, ownership checks, signed media URLs.
"""

import concurrent.futures
from datetime import datetime, timedelta, timezone
import json
import logging
import os
import re
import shutil
import sys
import uuid
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field, field_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# Ensure backend/ is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Load environment variables
load_dotenv(BACKEND_DIR / ".env", override=True)
load_dotenv(PROJECT_ROOT / ".env", override=True)

from config import (
    ALLOWED_FONTS,
    DAILY_ANALYZE_IMAGE_CAP,
    DAILY_NEW_INVITATIONS_FREE_CAP,
    DAILY_NEW_INVITATIONS_PAID_CAP,
    MAX_CREATE_SCENES_RUNS_PER_INVITATION,
    MAX_IMAGE_GENERATIONS_PER_SCENE,
    MAX_INVITATION_DICT_BYTES,
    MAX_INVITATION_FIELD_LEN,
    MAX_REGENERATE_INSTRUCTION_LEN,
    MAX_VIDEO_GENERATIONS_PER_SCENE,
    RATE_LIMIT_ANALYZE_IMAGE,
    RATE_LIMIT_CREATE_SCENES,
    RATE_LIMIT_GENERATE_IMAGES,
    RATE_LIMIT_GENERATE_VIDEO,
    RATE_LIMIT_REGENERATE_IMAGE,
    normalize_category,
)
from storage import (
    create_invitation,
    invitation_dir,
    load_state,
    save_state,
    update_scene,
    validate_invitation_id,
    try_claim_initial_image_generation,
    try_claim_image_regeneration,
    release_image_generation,
    try_claim_video_generation,
    release_video_generation,
    image_path as get_image_path,
    video_path as get_video_path,
    rel,
)
from db import ApiUsageEvent, Invitation, Order, Scene, User, create_tables, get_session
from sqlalchemy import func
from graph1.nodes import (
    split_scenes,
    style_bible,
    build_prompt_scene,
    collect_prompts,
    layout_text_scene,
    build_text_layer,
    regenerate_image as node_regenerate_image,
    _generate_one_image,
    _file_to_b64,
)
from graph2.nodes import (
    analyze_one_scene,
    generate_video_for_scene,
    format_should_move_as_strings,
)
from app.render import render_project
from app.render.adapter import frontend_to_project
from auth import decode_access_token, sign_media_url, verify_media_signature
from auth_routes import router as auth_router, get_current_user
from leads_routes import router as leads_router
from payment_routes import router as payment_router, validate_razorpay_config

logger = logging.getLogger("sky_invites_api")
logging.basicConfig(level=logging.INFO)

APP_ENV = os.environ.get("APP_ENV", "production").strip().lower() or "production"
IS_PRODUCTION = APP_ENV == "production"

_PLACEHOLDER_PATTERNS = ("changeme", "placeholder", "your-", "dev-", "example", "replace-me", "secret-key")


def _looks_like_placeholder(val: str) -> bool:
    low = val.strip().lower()
    return any(p in low for p in _PLACEHOLDER_PATTERNS)


def validate_startup_config() -> None:
    """Validate required keys and production safety invariants at startup."""
    if not os.environ.get("OPENAI_API_KEY", "").strip():
        raise RuntimeError("OPENAI_API_KEY environment variable is required.")
    if not os.environ.get("XAI_API_KEY", "").strip():
        raise RuntimeError("XAI_API_KEY environment variable is required.")

    if not IS_PRODUCTION:
        return

    frontend_origin = os.environ.get("FRONTEND_ORIGIN", "").strip()
    if not frontend_origin or "localhost" in frontend_origin.lower() or "127.0.0.1" in frontend_origin:
        raise RuntimeError("FRONTEND_ORIGIN must be set and must not contain localhost in production.")

    for secret_name in ("JWT_SECRET_KEY", "MEDIA_SIGNING_SECRET"):
        secret_val = os.environ.get(secret_name, "").strip()
        if len(secret_val) < 32 or _looks_like_placeholder(secret_val):
            raise RuntimeError(f"{secret_name} must be at least 32 characters and not a placeholder in production.")

    if not os.environ.get("DATABASE_URL", "").strip():
        raise RuntimeError("DATABASE_URL must be set in production.")

    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg must be installed and on PATH in production.")

    fonts_dir = BACKEND_DIR / "assets" / "fonts"
    for family in ALLOWED_FONTS:
        compact = family.replace(" ", "")
        regular = fonts_dir / f"{compact}-Regular.ttf"
        if not regular.is_file():
            raise RuntimeError(f"Missing required font file for '{family}': {regular}")


def _user_rate_key(request: Request) -> str:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:].strip()
        uid = decode_access_token(token)
        if uid:
            return f"user:{uid}"
    return f"ip:{get_remote_address(request)}"


# ── Rate limiter (disabled for now) ────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, enabled=False)
user_limiter = Limiter(key_func=_user_rate_key, enabled=False)

app = FastAPI(
    title="Sky Invites API",
    version="1.0.0",
    docs_url=None if IS_PRODUCTION else "/docs",
    redoc_url=None if IS_PRODUCTION else "/redoc",
    openapi_url=None if IS_PRODUCTION else "/openapi.json",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    if IS_PRODUCTION:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
    return response


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.on_event("startup")
def _on_startup() -> None:
    validate_startup_config()
    validate_razorpay_config()
    create_tables()
    from credits import sweep_stuck_generating_scenes
    sweep_stuck_generating_scenes()

# ── CORS ───────────────────────────────────────────────────────────────────────
_raw_origins = os.environ.get("FRONTEND_ORIGIN", "")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth router (rate-limited login/signup defined there) ──────────────────────
app.include_router(auth_router)
app.include_router(payment_router)
app.include_router(leads_router)

# ── Media directory (no longer publicly mounted) ───────────────────────────────
MEDIA_DIR = (PROJECT_ROOT / "media").resolve()
MEDIA_DIR.mkdir(parents=True, exist_ok=True)


# ── Request / Response Models ──────────────────────────────────────────────────

def _check_nested_string_lengths(obj: Any, max_len: int) -> None:
    if isinstance(obj, str):
        if len(obj) > max_len:
            raise ValueError(f"Field exceeds maximum length of {max_len} characters")
    elif isinstance(obj, dict):
        for k, v in obj.items():
            if isinstance(k, str) and len(k) > max_len:
                raise ValueError(f"Field key exceeds maximum length of {max_len} characters")
            _check_nested_string_lengths(v, max_len)
    elif isinstance(obj, list):
        for item in obj:
            _check_nested_string_lengths(item, max_len)


class CreateScenesRequest(BaseModel):
    invitation: dict[str, Any]

    @field_validator("invitation")
    @classmethod
    def validate_invitation_size(cls, v: dict[str, Any]) -> dict[str, Any]:
        serialized = json.dumps(v, ensure_ascii=False)
        if len(serialized.encode("utf-8")) > MAX_INVITATION_DICT_BYTES:
            raise ValueError(f"Invitation payload exceeds {MAX_INVITATION_DICT_BYTES} bytes")
        _check_nested_string_lengths(v, MAX_INVITATION_FIELD_LEN)
        return v


class GenerateImagesRequest(BaseModel):
    invitation_id: str
    story_driven: bool = False

    @field_validator("invitation_id")
    @classmethod
    def check_id(cls, v: str) -> str:
        return validate_invitation_id(v)


class RegenerateImageRequest(BaseModel):
    invitation_id: str
    scene_index: int
    custom_prompt: Optional[str] = Field(default=None, max_length=MAX_INVITATION_FIELD_LEN)
    instruction: Optional[str] = Field(default=None, max_length=MAX_REGENERATE_INSTRUCTION_LEN)

    @field_validator("invitation_id")
    @classmethod
    def check_id(cls, v: str) -> str:
        return validate_invitation_id(v)


class AnalyzeImageRequest(BaseModel):
    invitation_id: str
    scene_index: int
    animation_note: Optional[str] = Field(default=None, max_length=MAX_INVITATION_FIELD_LEN)

    @field_validator("invitation_id")
    @classmethod
    def check_id(cls, v: str) -> str:
        return validate_invitation_id(v)


class GenerateVideoRequest(BaseModel):
    invitation_id: str
    scene_index: int

    @field_validator("invitation_id")
    @classmethod
    def check_id(cls, v: str) -> str:
        return validate_invitation_id(v)


class PatchSceneRequest(BaseModel):
    text_layer: Optional[dict[str, Any]] = None
    image_prompt: Optional[str] = None
    video_prompt: Optional[str] = None
    animation_note: Optional[str] = None
    animation_plan: Optional[dict[str, Any]] = None


class ExportVideoRequest(BaseModel):
    invitation_id: str
    scenes: list[dict[str, Any]]
    transition: Optional[str] = None
    title: Optional[str] = None

    @field_validator("invitation_id")
    @classmethod
    def check_id(cls, v: str) -> str:
        return validate_invitation_id(v)


# ── Ownership helper ───────────────────────────────────────────────────────────

def _validate_id_or_400(invitation_id: str) -> str:
    try:
        return validate_invitation_id(invitation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid invitation ID")


def _load_and_assert_owner(invitation_id: str, user: User) -> dict:
    """Load invitation state and verify ownership. Raises 400 on bad ID, 404 on any failure."""
    _validate_id_or_400(invitation_id)
    try:
        st = load_state(invitation_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Invitation not found")

    with get_session() as session:
        inv = session.query(Invitation).filter(Invitation.id == invitation_id).first()
        if not inv:
            raise HTTPException(status_code=404, detail="Invitation not found")
        if inv.user_id != user.id:
            # Return 404 — never confirm existence to wrong user
            raise HTTPException(status_code=404, detail="Invitation not found")

    return st


# ── Signed media URL helper ────────────────────────────────────────────────────

def _sign_scene_urls(scene_dict: dict, invitation_id: str) -> dict:
    """Replace /media/... paths with signed /api/media/... URLs in a scene dict."""
    for key in ("imageUrl", "videoUrl"):
        val = scene_dict.get(key)
        if val and isinstance(val, str) and val.startswith("/media/"):
            # Extract filename from /media/{id}/{file}
            parts = val.split("/")
            if len(parts) >= 4:
                filename = "/".join(parts[3:])
                scene_dict[key] = sign_media_url(invitation_id, filename)
    return scene_dict


def _sign_export_url(url: str, invitation_id: str) -> str:
    if url and url.startswith("/media/"):
        parts = url.split("/")
        if len(parts) >= 4:
            filename = "/".join(parts[3:])
            return sign_media_url(invitation_id, filename)
    return url


# ── Conversion Helpers ─────────────────────────────────────────────────────────

def frontend_to_backend_input(inv: dict[str, Any]) -> dict[str, Any]:
    """Convert frontend Invitation into the backend's expected input structure."""
    details = inv.get("details", {})
    design = inv.get("design", {})
    palette = design.get("palette", {})

    theme_name = design.get("theme", "Royal")
    palette_name = palette.get("name", "Champagne & Ivory") if isinstance(palette, dict) else ""
    msg = details.get("message", "")
    style_desc = f"{theme_name} aesthetic with {palette_name} palette. {msg}".strip()

    events = []
    for ev in details.get("events", []):
        events.append({
            "name": ev.get("name", ""),
            "date": ev.get("date", ""),
            "time": ev.get("time", ""),
            "venue": ev.get("venue", ""),
        })

    category = normalize_category(inv.get("type", "Wedding"))

    return {
        "invitation_type": category,
        "bride_name": details.get("brideName", ""),
        "groom_name": details.get("groomName", ""),
        "bride_parents": details.get("brideParents", ""),
        "groom_parents": details.get("groomParents", ""),
        "honoree_name": details.get("honoreeName", ""),
        "host_name": details.get("hostName", ""),
        "message": msg,
        "events": events,
        "style_description": style_desc,
        "num_scenes": design.get("sceneCount", max(1, len(events))),
        "transition_type": design.get("transition", "Fade").lower(),
        "theme": theme_name,
        "style": f"{theme_name} Luxury",
        "story_mode": design.get("storyDriven", False),
        "heading_font": design.get("headingFont", "Playfair Display"),
        "body_font": design.get("bodyFont", "Cormorant Garamond"),
        "text_animation": design.get("textAnimation", "Slide-up"),
        "duration_per_scene": design.get("durationPerScene", 5),
    }


def build_default_text_layer(scene: dict[str, Any], inv_input: dict[str, Any]) -> dict[str, Any]:
    return build_text_layer(scene, inv_input)


def backend_scene_to_frontend(scene: dict[str, Any], invitation_id: str, inv_input: dict[str, Any]) -> dict[str, Any]:
    idx = scene.get("scene_index", 0)
    has_image = bool(scene.get("image_path"))
    scene_status = scene.get("status", "pending")

    if scene_status == "failed":
        img_status = "failed"
    elif has_image:
        img_status = "done"
    elif scene_status == "generating":
        img_status = "generating"
    else:
        img_status = "pending"

    # Raw /media/ path — will be signed before returning to client
    image_url = f"/media/{invitation_id}/scene_{idx}.png" if has_image else ""

    text_layer = scene.get("text_layer")
    if not text_layer:
        text_layer = build_default_text_layer(scene, inv_input)

    raw_animation_plan = scene.get("animation_plan")
    has_video = bool(scene.get("video_path"))
    if not raw_animation_plan:
        animation_plan = {
            "objectsDetected": [],
            "keepStationary": [],
            "shouldMove": [],
            "cameraMovement": "Static",
            "grokPrompt": scene.get("video_prompt", ""),
            "videoStatus": "done" if has_video else "idle",
            "videoProgress": 100 if has_video else 0,
        }
    else:
        animation_plan = dict(raw_animation_plan)
        animation_plan["shouldMove"] = format_should_move_as_strings(raw_animation_plan.get("shouldMove", []))
        if has_video and animation_plan.get("videoStatus") != "done":
            animation_plan["videoStatus"] = "done"
            animation_plan["videoProgress"] = 100
        elif not has_video and animation_plan.get("videoStatus") == "done":
            animation_plan["videoProgress"] = 100

    result = {
        "id": f"sc-{invitation_id}-{idx}",
        "order": idx + 1,
        "title": scene.get("scene_purpose", f"Scene {idx + 1}"),
        "imageUrl": image_url,
        "imagePrompt": scene.get("image_prompt", ""),
        "imageStatus": img_status,
        "confirmed": img_status == "done",
        "durationSec": inv_input.get("duration_per_scene", 5),
        "transitionAfter": inv_input.get("transition_type", "Fade").capitalize(),
        "textLayer": text_layer,
        "animationPlan": animation_plan,
        "videoUrl": f"/media/{invitation_id}/scene_{idx}.mp4" if has_video else None,
        "analyzed": bool(scene.get("analyzed", False)),
        "imageGenerations": int(scene.get("image_generations", 0)),
        "videoGenerations": int(scene.get("video_generations", 0)),
        "maxImageGenerations": MAX_IMAGE_GENERATIONS_PER_SCENE,
        "maxVideoGenerations": MAX_VIDEO_GENERATIONS_PER_SCENE,
    }
    return _sign_scene_urls(result, invitation_id)


# ── Background Task Workers ────────────────────────────────────────────────────

def run_create_scenes_task(invitation_id: str, inv_input: dict[str, Any]) -> None:
    try:
        logger.info(f"[{invitation_id}] Starting Stage 1: create_scenes")
        st = load_state(invitation_id)
        st["status"] = "running"
        save_state(invitation_id, st)

        llm_input = {k: v for k, v in inv_input.items() if k != "frontend_invitation"}

        split_res = split_scenes({"invitation_id": invitation_id, "input": llm_input})
        st = load_state(invitation_id)
        scenes = st["scenes"]

        bible_res = style_bible({"invitation_id": invitation_id, "input": llm_input})
        st = load_state(invitation_id)

        prompt_results = []
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future_to_idx = {
                executor.submit(
                    build_prompt_scene,
                    {
                        "invitation_id": invitation_id,
                        "input": llm_input,
                        "style_bible": st["style_bible"],
                        "_current_scene": sc,
                    },
                ): sc["scene_index"]
                for sc in scenes
            }
            for future in concurrent.futures.as_completed(future_to_idx):
                res = future.result()
                prompt_results.extend(res["_prompt_results"])

        st = load_state(invitation_id)
        prompt_map = {r["scene_index"]: r["image_prompt"] for r in prompt_results}
        for sc in st["scenes"]:
            idx = sc["scene_index"]
            sc["image_prompt"] = prompt_map.get(idx, "")
            sc["status"] = "pending"
            sc["text_layer"] = build_default_text_layer(sc, inv_input)

        st["status"] = "stage1_done"
        save_state(invitation_id, st)
        logger.info(f"[{invitation_id}] Stage 1 completed successfully.")

    except Exception as exc:
        logger.error(f"[{invitation_id}] Stage 1 failed: {exc}", exc_info=True)
        try:
            st = load_state(invitation_id)
            st["status"] = "failed"
            save_state(invitation_id, st)
        except Exception:
            pass


def _generate_and_layout_single_scene(
    invitation_id: str,
    scene: dict[str, Any],
    inv_input: dict[str, Any],
    style_bible_data: dict[str, Any],
    prev_b64: Optional[str] = None,
) -> tuple[int, bool, Optional[str]]:
    idx = scene["scene_index"]
    try:
        out = get_image_path(invitation_id, idx)
        _generate_one_image(scene["image_prompt"], out, prev_b64)
        img_rel = rel(out)

        state_for_layout = {
            "invitation_id": invitation_id,
            "input": inv_input,
            "style_bible": style_bible_data,
            "_current_scene": {**scene, "image_path": img_rel},
        }
        layout_res = layout_text_scene(state_for_layout)
        text_layer = layout_res["_layout_results"][0]["text_layer"]

        update_scene(
            invitation_id,
            idx,
            image_path=img_rel,
            text_layer=text_layer,
            status="done",
        )
        return idx, True, _file_to_b64(out)
    except Exception as err:
        logger.error(f"[{invitation_id}] Scene {idx} image generation failed: {err}")
        release_image_generation(invitation_id, idx, restore_status="failed")
        return idx, False, None


def run_generate_images_task(invitation_id: str, story_driven: bool) -> None:
    try:
        logger.info(f"[{invitation_id}] Starting Stage 2: generate_images (story_driven={story_driven})")
        st = load_state(invitation_id)
        st["status"] = "running"
        save_state(invitation_id, st)

        scenes = sorted(st["scenes"], key=lambda s: s["scene_index"])
        inv_input = st["input"]
        bible = st["style_bible"]

        from pricing_config import IMAGE_INITIAL_COST

        scenes_to_generate = []
        for s in scenes:
            if s.get("image_path"):
                continue
            claimed, _, _, _ = try_claim_initial_image_generation(
                invitation_id,
                s["scene_index"],
                user_id=st.get("user_id"),
                credit_cost=IMAGE_INITIAL_COST,
            )
            if claimed:
                scenes_to_generate.append(s)

        if story_driven:
            prev_b64: Optional[str] = None
            for sc in scenes_to_generate:
                _, success, next_b64 = _generate_and_layout_single_scene(
                    invitation_id, sc, inv_input, bible, prev_b64
                )
                if success:
                    prev_b64 = next_b64
        else:
            with concurrent.futures.ThreadPoolExecutor() as executor:
                futures = [
                    executor.submit(
                        _generate_and_layout_single_scene,
                        invitation_id,
                        sc,
                        inv_input,
                        bible,
                        None,
                    )
                    for sc in scenes_to_generate
                ]
                for f in concurrent.futures.as_completed(futures):
                    f.result()

        st = load_state(invitation_id)
        all_failed = all(s.get("status") == "failed" for s in st["scenes"])
        st["status"] = "failed" if all_failed else "done"
        save_state(invitation_id, st)
        logger.info(f"[{invitation_id}] Stage 2 completed. Status: {st['status']}")

    except Exception as exc:
        logger.error(f"[{invitation_id}] Stage 2 failed: {exc}", exc_info=True)
        try:
            st = load_state(invitation_id)
            st["status"] = "failed"
            save_state(invitation_id, st)
        except Exception:
            pass


def run_regenerate_image_task(invitation_id: str, scene_index: int, prompt: Optional[str]) -> None:
    try:
        node_regenerate_image(invitation_id, scene_index, prompt)

        st = load_state(invitation_id)
        scene = next(s for s in st["scenes"] if s["scene_index"] == scene_index)
        layout_res = layout_text_scene({
            "invitation_id": invitation_id,
            "input": st["input"],
            "style_bible": st["style_bible"],
            "_current_scene": scene,
        })
        text_layer = layout_res["_layout_results"][0]["text_layer"]
        update_scene(invitation_id, scene_index, text_layer=text_layer, status="done", analyzed=False)
    except Exception as err:
        logger.error(f"[{invitation_id}] Scene {scene_index} regenerate failed: {err}")
        try:
            st = load_state(invitation_id)
            sc = next((s for s in st["scenes"] if s["scene_index"] == scene_index), {})
            restore = "done" if sc.get("image_path") else "failed"
        except Exception:
            restore = "failed"
        release_image_generation(invitation_id, scene_index, restore_status=restore)


def run_generate_video_task(invitation_id: str, scene_index: int) -> None:
    try:
        generate_video_for_scene(invitation_id, scene_index)
    except Exception as err:
        logger.error(f"[{invitation_id}] Scene {scene_index} video generation failed: {err}")
        release_video_generation(invitation_id, scene_index)


def run_export_video_task(
    invitation_id: str,
    scenes: list[dict[str, Any]],
    transition: Optional[str] = None,
    title: Optional[str] = None,
) -> None:
    inv_folder = invitation_dir(invitation_id)
    export_dir = inv_folder / "export"
    export_dir.mkdir(parents=True, exist_ok=True)
    status_file = export_dir / "status.json"
    work_dir = export_dir / "work"
    work_dir.mkdir(parents=True, exist_ok=True)
    final_output = export_dir / "final.mp4"

    def write_status(st: dict[str, Any]) -> None:
        try:
            status_file.write_text(json.dumps(st, indent=2), encoding="utf-8")
        except Exception as e:
            logger.error(f"Failed to write export status: {e}")

    write_status({
        "status": "rendering",
        "progress": 5,
        "stage": "Preparing video project...",
        "error": None,
        "url": None,
        "fileName": None,
        "sizeMb": None,
    })

    try:
        logger.info(f"[{invitation_id}] Starting video export for {len(scenes)} scenes")
        project = frontend_to_project(
            invitation_id=invitation_id,
            frontend_scenes=scenes,
            media_dir=MEDIA_DIR,
            work_dir=work_dir,
            overall_transition=transition,
        )

        n = len(project.scenes)

        def on_progress(stage: str, i: int, total: int) -> None:
            if stage == "scene":
                pct = round(10 + (i / max(1, total)) * 75)
                msg = f"Rendering scene {i + 1} of {total}..."
            elif stage == "stitch":
                pct = 90
                msg = "Applying scene transitions & stitching..."
            elif stage == "done":
                pct = 100
                msg = "Export ready"
            else:
                pct = 50
                msg = f"Processing {stage}..."

            write_status({
                "status": "rendering",
                "progress": pct,
                "stage": msg,
                "error": None,
                "url": None,
                "fileName": None,
                "sizeMb": None,
            })

        render_result = render_project(
            project=project,
            work_dir=work_dir,
            output=final_output,
            progress=on_progress,
        )

        size_mb = f"{final_output.stat().st_size / (1024 * 1024):.1f} MB"
        slug = re.sub(r"[^a-z0-9]+", "-", (title or invitation_id).lower()).strip("-")
        file_name = f"{slug or 'sky-invite'}-1080x1920.mp4"
        # Raw /media/ path stored in status.json — signed when served via GET export-status
        media_url = f"/media/{invitation_id}/export/final.mp4"

        write_status({
            "status": "done",
            "progress": 100,
            "stage": "Export ready",
            "error": None,
            "url": media_url,
            "fileName": file_name,
            "sizeMb": size_mb,
        })
        logger.info(f"[{invitation_id}] Video export complete: {final_output} ({size_mb})")

    except Exception as exc:
        logger.error(f"[{invitation_id}] Video export failed: {exc}", exc_info=True)
        write_status({
            "status": "failed",
            "progress": 0,
            "stage": "Export failed",
            "error": "Video export failed. Please try again.",
            "url": None,
            "fileName": None,
            "sizeMb": None,
        })


# ── Guarded media endpoint ─────────────────────────────────────────────────────

@app.get("/api/media/{invitation_id}/{file_path:path}")
def serve_media(
    invitation_id: str,
    file_path: str,
    exp: Optional[str] = Query(default=None),
    sig: Optional[str] = Query(default=None),
):
    """
    Serves media files with HMAC signature + expiry verification.
    Does NOT require a Bearer token (img/video tags cannot send it).
    Returns 404 on any failure to avoid leaking information.
    """
    # Reject missing params
    if not exp or not sig:
        raise HTTPException(status_code=404, detail="Not found")

    # Validate invitation_id and reject path traversal attempts
    try:
        allowed_root = invitation_dir(invitation_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Not found")

    if ".." in file_path or file_path.startswith("/") or "\\" in file_path:
        raise HTTPException(status_code=404, detail="Not found")

    # Verify HMAC + expiry
    if not verify_media_signature(invitation_id, file_path, exp, sig):
        raise HTTPException(status_code=404, detail="Not found")

    # Resolve and check the file
    target = (allowed_root / file_path).resolve()

    # Second path-traversal check after resolve
    if not target.is_relative_to(allowed_root):
        raise HTTPException(status_code=404, detail="Not found")

    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="Not found")

    return FileResponse(str(target))


# ── Invitation Endpoints ───────────────────────────────────────────────────────

@app.post("/api/create-scenes", status_code=status.HTTP_202_ACCEPTED)
@user_limiter.limit(RATE_LIMIT_CREATE_SCENES)
def create_scenes_endpoint(
    request: Request,
    req: CreateScenesRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    raw_inv = req.invitation
    candidate_id = raw_inv.get("id")
    inv_id: Optional[str] = None

    # Honor a client-supplied id ONLY if it is valid, already exists in DB, AND belongs to the caller.
    if isinstance(candidate_id, str) and candidate_id.strip():
        try:
            valid_candidate = validate_invitation_id(candidate_id.strip())
            with get_session() as session:
                inv = session.query(Invitation).filter(Invitation.id == valid_candidate).first()
                if inv and inv.user_id == current_user.id:
                    inv_id = valid_candidate
                    existing_st = load_state(inv_id)
                    if existing_st.get("scenes"):
                        return {
                            "invitation_id": inv_id,
                            "status": existing_st.get("status", "stage1_done"),
                            "existing": True,
                        }
                    inv.create_scenes_count = (inv.create_scenes_count or 0) + 1
        except ValueError:
            pass

    if inv_id is None:
        # Ignore any unknown/unowned/orphan client id and generate a fresh server-side uuid4 hex.
        inv_id = uuid.uuid4().hex

        backend_input = frontend_to_backend_input(raw_inv)
        backend_input["frontend_invitation"] = raw_inv
        create_invitation(inv_id, backend_input)
        with get_session() as session:
            inv = session.query(Invitation).filter(Invitation.id == inv_id).first()
            if inv:
                inv.user_id = current_user.id
                inv.create_scenes_count = 1
    else:
        backend_input = frontend_to_backend_input(raw_inv)
        backend_input["frontend_invitation"] = raw_inv

    background_tasks.add_task(run_create_scenes_task, inv_id, backend_input)
    return {"invitation_id": inv_id, "status": "running"}


@app.post("/api/generate-images", status_code=status.HTTP_202_ACCEPTED)
@user_limiter.limit(RATE_LIMIT_GENERATE_IMAGES)
def generate_images_endpoint(
    request: Request,
    req: GenerateImagesRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
) -> Any:
    from credits import get_balances
    from db import get_session
    from pricing_config import IMAGE_INITIAL_COST

    st = _load_and_assert_owner(req.invitation_id, current_user)
    scenes = st.get("scenes", [])
    if scenes and all(s.get("image_path") for s in scenes):
        return {"invitation_id": req.invitation_id, "status": "done", "existing": True}

    pending_count = sum(1 for s in scenes if not s.get("image_path") and s.get("status") != "generating")
    needed = pending_count * IMAGE_INITIAL_COST
    if needed > 0:
        with get_session() as session:
            available = get_balances(session, current_user.id).get("image", 0)
        if available < needed:
            return JSONResponse(
                status_code=402,
                content={
                    "code": "INSUFFICIENT_CREDITS",
                    "credit_type": "image",
                    "needed": needed,
                    "available": available,
                    "detail": f"Need {needed} image credit(s), have {available}.",
                },
            )

    background_tasks.add_task(run_generate_images_task, req.invitation_id, req.story_driven)
    return {"invitation_id": req.invitation_id, "status": "running"}


@app.post("/api/regenerate-image", status_code=status.HTTP_202_ACCEPTED)
@user_limiter.limit(RATE_LIMIT_REGENERATE_IMAGE)
def regenerate_image_endpoint(
    request: Request,
    req: RegenerateImageRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
) -> Any:
    from pricing_config import IMAGE_REGENERATION_COST

    st = _load_and_assert_owner(req.invitation_id, current_user)
    scene = next((s for s in st["scenes"] if s["scene_index"] == req.scene_index), None)
    if not scene:
        raise HTTPException(status_code=404, detail=f"Card {req.scene_index + 1} not found")

    claimed, http_status_code, err_code, detail = try_claim_image_regeneration(
        req.invitation_id,
        req.scene_index,
        MAX_IMAGE_GENERATIONS_PER_SCENE,
        user_id=current_user.id,
        credit_cost=IMAGE_REGENERATION_COST,
    )
    if not claimed:
        return JSONResponse(status_code=http_status_code, content={"code": err_code, "detail": detail})

    final_prompt = req.custom_prompt
    if req.instruction and req.instruction.strip():
        base = req.custom_prompt or scene.get("image_prompt", "")
        final_prompt = f"{base} Refined: {req.instruction.strip()}"

    background_tasks.add_task(run_regenerate_image_task, req.invitation_id, req.scene_index, final_prompt)
    return {"invitation_id": req.invitation_id, "scene_index": req.scene_index, "status": "running"}


@app.post("/api/analyze-image")
@user_limiter.limit(RATE_LIMIT_ANALYZE_IMAGE)
def analyze_image_endpoint(
    request: Request,
    req: AnalyzeImageRequest,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    st = _load_and_assert_owner(req.invitation_id, current_user)
    scene = next((s for s in st.get("scenes", []) if s["scene_index"] == req.scene_index), None)
    if not scene:
        raise HTTPException(status_code=404, detail="Card not found")

    if scene.get("analyzed") and scene.get("animation_plan"):
        plan = dict(scene["animation_plan"])
        plan["shouldMove"] = format_should_move_as_strings(plan.get("shouldMove", []))
        return plan

    with get_session() as session:
        session.add(ApiUsageEvent(user_id=current_user.id, endpoint="analyze-image"))

    try:
        plan = analyze_one_scene(req.invitation_id, req.scene_index, req.animation_note)
        update_scene(req.invitation_id, req.scene_index, analyzed=True)
        return plan
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Invitation or card image not found")
    except Exception as exc:
        logger.error(f"analyze-image error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Image analysis failed. Please try again.")


@app.post("/api/generate-video", status_code=status.HTTP_202_ACCEPTED)
@user_limiter.limit(RATE_LIMIT_GENERATE_VIDEO)
def generate_video_endpoint(
    request: Request,
    req: GenerateVideoRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
) -> Any:
    from pricing_config import VIDEO_INITIAL_COST

    _load_and_assert_owner(req.invitation_id, current_user)
    claimed, http_status_code, err_code, detail = try_claim_video_generation(
        req.invitation_id,
        req.scene_index,
        MAX_VIDEO_GENERATIONS_PER_SCENE,
        user_id=current_user.id,
        credit_cost=VIDEO_INITIAL_COST,
    )
    if not claimed:
        return JSONResponse(status_code=http_status_code, content={"code": err_code, "detail": detail})

    background_tasks.add_task(run_generate_video_task, req.invitation_id, req.scene_index)
    return {"invitation_id": req.invitation_id, "scene_index": req.scene_index, "status": "queued"}


@app.get("/api/credits")
def get_credits_endpoint(current_user: User = Depends(get_current_user)) -> dict[str, Any]:
    from credits import get_user_credits_summary
    return get_user_credits_summary(current_user.id)


@app.get("/api/plans")
def get_plans_endpoint() -> dict[str, Any]:
    from pricing_config import (
        CREDITS_EXPIRE,
        FREE_TIER_CREDITS,
        IMAGE_FREE_REGENERATIONS_PER_CARD,
        IMAGE_INITIAL_COST,
        IMAGE_REGENERATION_COST,
        PLANS,
        UNIT_PRICES_PAISE,
        VIDEO_INITIAL_COST,
    )
    return {
        "plans": PLANS,
        "unit_prices_paise": UNIT_PRICES_PAISE,
        "free_tier_credits": FREE_TIER_CREDITS,
        "credits_expire": CREDITS_EXPIRE,
        "rules": {
            "image_initial_cost": IMAGE_INITIAL_COST,
            "image_free_regenerations_per_card": IMAGE_FREE_REGENERATIONS_PER_CARD,
            "image_regeneration_cost": IMAGE_REGENERATION_COST,
            "video_initial_cost": VIDEO_INITIAL_COST,
        },
    }


@app.get("/api/invitations/{invitation_id}/status")
def get_invitation_status(
    invitation_id: str,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    st = _load_and_assert_owner(invitation_id, current_user)
    inv_status = st.get("status", "pending")
    scenes_status = []

    for s in sorted(st.get("scenes", []), key=lambda x: x["scene_index"]):
        idx = s["scene_index"]
        has_image = bool(s.get("image_path"))
        has_video = bool(s.get("video_path"))
        s_status = s.get("status", "pending")

        if s_status == "failed":
            img_status = "failed"
        elif has_image:
            img_status = "done"
        elif s_status == "generating":
            img_status = "generating"
        else:
            img_status = "pending"

        anim_plan = s.get("animation_plan") or {}
        v_status = anim_plan.get("videoStatus", "done" if has_video else "idle")
        v_progress = anim_plan.get("videoProgress", 100 if has_video else 0)

        raw_image_url = f"/media/{invitation_id}/scene_{idx}.png" if has_image else None
        raw_video_url = f"/media/{invitation_id}/scene_{idx}.mp4" if has_video else None

        scenes_status.append({
            "id": f"sc-{invitation_id}-{idx}",
            "scene_index": idx,
            "order": idx + 1,
            "title": s.get("scene_purpose", f"Scene {idx + 1}"),
            "image_status": img_status,
            "video_status": v_status,
            "video_progress": v_progress,
            "image_url": sign_media_url(invitation_id, f"scene_{idx}.png") if has_image else None,
            "video_url": sign_media_url(invitation_id, f"scene_{idx}.mp4") if has_video else None,
            "image_generations": int(s.get("image_generations", 0)),
            "video_generations": int(s.get("video_generations", 0)),
            "analyzed": bool(s.get("analyzed", False)),
        })

    return {
        "invitation_id": invitation_id,
        "status": inv_status,
        "scenes": scenes_status,
    }


@app.get("/api/invitations")
def list_invitations(current_user: User = Depends(get_current_user)) -> list[dict[str, Any]]:
    """List invitations belonging to the current user, newest first."""
    with get_session() as session:
        invs = (
            session.query(Invitation)
            .filter(Invitation.user_id == current_user.id)
            .order_by(Invitation.created_at.desc())
            .all()
        )
        result = []
        for inv in invs:
            scene_count = (
                session.query(func.count(Scene.id))
                .filter(Scene.invitation_id == inv.id)
                .scalar() or 0
            )
            f_inv = (inv.user_input or {}).get("frontend_invitation") or {}

            title = f_inv.get("title")
            if not title:
                u_input = inv.user_input or {}
                bride = u_input.get("bride_name", "")
                groom = u_input.get("groom_name", "")
                honoree = u_input.get("honoree_name", "")
                host = u_input.get("host_name", "")
                if bride and groom:
                    title = f"{groom.split(' ')[0]} weds {bride.split(' ')[0]}"
                elif bride or groom:
                    title = bride or groom
                elif honoree:
                    title = honoree
                elif host:
                    title = host
                else:
                    title = inv.id

            result.append({
                "invitation_id": inv.id,
                "title": title,
                "type": (inv.type or f_inv.get("type") or "Custom").capitalize(),
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
                "status": inv.status or "pending",
                "scene_count": scene_count,
            })
        return result


@app.get("/api/invitations/{invitation_id}")
def get_invitation(
    invitation_id: str,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    st = _load_and_assert_owner(invitation_id, current_user)
    inv_input = st.get("input", {})
    scenes = [
        backend_scene_to_frontend(s, invitation_id, inv_input)
        for s in sorted(st.get("scenes", []), key=lambda x: x["scene_index"])
    ]

    return {
        "invitation_id": invitation_id,
        "style_bible": st.get("style_bible"),
        "frontend_invitation": inv_input.get("frontend_invitation"),
        "user_input": inv_input,
        "scenes": scenes,
    }


@app.patch("/api/invitations/{invitation_id}/scenes/{scene_index}")
def patch_scene(
    invitation_id: str,
    scene_index: int,
    req: PatchSceneRequest,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    st = _load_and_assert_owner(invitation_id, current_user)
    scene = next((s for s in st["scenes"] if s["scene_index"] == scene_index), None)
    if not scene:
        raise HTTPException(status_code=404, detail=f"Scene {scene_index} not found")

    fields_to_update: dict[str, Any] = {}
    if req.text_layer is not None:
        fields_to_update["text_layer"] = req.text_layer
    if req.image_prompt is not None:
        fields_to_update["image_prompt"] = req.image_prompt
    if req.video_prompt is not None:
        fields_to_update["video_prompt"] = req.video_prompt
        if scene.get("animation_plan"):
            plan_copy = dict(scene["animation_plan"])
            plan_copy["grokPrompt"] = req.video_prompt
            fields_to_update["animation_plan"] = plan_copy
    if req.animation_note is not None:
        fields_to_update["animation_note"] = req.animation_note
    if req.animation_plan is not None:
        fields_to_update["animation_plan"] = req.animation_plan

    if fields_to_update:
        update_scene(invitation_id, scene_index, **fields_to_update)

    fresh_st = load_state(invitation_id)
    updated_scene = next(s for s in fresh_st["scenes"] if s["scene_index"] == scene_index)
    return {
        "invitation_id": invitation_id,
        "scene": backend_scene_to_frontend(updated_scene, invitation_id, fresh_st.get("input", {})),
    }


@app.post("/api/export-video", status_code=status.HTTP_202_ACCEPTED)
def export_video_endpoint(
    req: ExportVideoRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _load_and_assert_owner(req.invitation_id, current_user)
    background_tasks.add_task(
        run_export_video_task,
        req.invitation_id,
        req.scenes,
        req.transition,
        req.title,
    )
    return {"invitation_id": req.invitation_id, "status": "rendering"}


@app.get("/api/invitations/{invitation_id}/export-status")
def get_export_status(
    invitation_id: str,
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    _load_and_assert_owner(invitation_id, current_user)
    status_file = invitation_dir(invitation_id) / "export" / "status.json"
    if not status_file.exists():
        return {
            "status": "idle",
            "progress": 0,
            "stage": "Ready to export",
            "error": None,
            "url": None,
            "fileName": None,
            "sizeMb": None,
        }
    try:
        data = json.loads(status_file.read_text(encoding="utf-8"))
        # Sign the export URL if present
        if data.get("url"):
            data["url"] = _sign_export_url(data["url"], invitation_id)
        return data
    except Exception as e:
        logger.error(f"Error reading export status: {e}")
        return {
            "status": "failed",
            "progress": 0,
            "stage": "Status read error",
            "error": "Could not read export status.",
            "url": None,
            "fileName": None,
            "sizeMb": None,
        }

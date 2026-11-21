"""
api.py – FastAPI backend for Sky Invites.
Exposes endpoints matching services/api.ts shapes.
"""

import concurrent.futures
import json
import logging
import os
import sys
import uuid
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

# Ensure backend/ is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Load environment variables (override=True so backend/.env takes priority over stale system env vars)
load_dotenv(BACKEND_DIR / ".env", override=True)
load_dotenv(PROJECT_ROOT / ".env", override=True)

from storage import (
    create_invitation,
    load_state,
    save_state,
    update_scene,
    image_path as get_image_path,
    video_path as get_video_path,
    rel,
)
from graph1.nodes import (
    split_scenes,
    style_bible,
    build_prompt_scene,
    collect_prompts,
    layout_text_scene,
    regenerate_image as node_regenerate_image,
    _generate_one_image,
    _file_to_b64,
)
from graph2.nodes import (
    analyze_one_scene,
    generate_video_for_scene,
)

logger = logging.getLogger("sky_invites_api")
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Sky Invites API", version="1.0.0")

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allow only frontend dev origin (port from frontend/package.json = 3000)
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static Media Mount ────────────────────────────────────────────────────────
MEDIA_DIR = (PROJECT_ROOT / "media").resolve()
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(MEDIA_DIR)), name="media")


# ── Request / Response Models ─────────────────────────────────────────────────

class CreateScenesRequest(BaseModel):
    invitation: dict[str, Any]


class GenerateImagesRequest(BaseModel):
    invitation_id: str
    story_driven: bool = False


class RegenerateImageRequest(BaseModel):
    invitation_id: str
    scene_index: int
    custom_prompt: Optional[str] = None
    instruction: Optional[str] = None


class AnalyzeImageRequest(BaseModel):
    invitation_id: str
    scene_index: int
    animation_note: Optional[str] = None


class GenerateVideoRequest(BaseModel):
    invitation_id: str
    scene_index: int


class PatchSceneRequest(BaseModel):
    text_layer: Optional[dict[str, Any]] = None
    image_prompt: Optional[str] = None
    video_prompt: Optional[str] = None
    animation_note: Optional[str] = None


# ── Conversion Helpers ────────────────────────────────────────────────────────

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

    return {
        "invitation_type": inv.get("type", "Wedding").lower(),
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
    """Construct a clean default TextLayer from scene text_data and design typography."""
    text_data = scene.get("text_data") or {}
    idx = scene.get("scene_index", 0)

    lines = []
    headline = text_data.get("headline", "").strip()
    if headline:
        lines.append({"id": f"l-{idx}-1", "role": "heading", "text": headline})

    sublines = text_data.get("sublines", [])
    if isinstance(sublines, list):
        for s_idx, sub in enumerate(sublines):
            if sub and str(sub).strip():
                lines.append({"id": f"l-{idx}-{s_idx + 2}", "role": "subheading", "text": str(sub).strip()})

    note = text_data.get("note", "").strip() if isinstance(text_data.get("note"), str) else ""
    if note:
        lines.append({"id": f"l-{idx}-note", "role": "detail", "text": note})

    if not lines:
        lines = [{"id": f"l-{idx}-1", "role": "heading", "text": scene.get("scene_purpose", "Celebration")}]

    return {
        "lines": lines,
        "headingFont": inv_input.get("heading_font", "Playfair Display"),
        "bodyFont": inv_input.get("body_font", "Cormorant Garamond"),
        "fontSize": 22,
        "color": "#FAF6EE",
        "alignment": "center",
        "placement": "center",
        "xOffset": 0,
        "yOffset": 0,
        "animation": inv_input.get("text_animation", "Slide-up"),
        "sequentialDelayMs": 250,
    }


def backend_scene_to_frontend(scene: dict[str, Any], invitation_id: str, inv_input: dict[str, Any]) -> dict[str, Any]:
    """Map internal scene representation to the frontend Scene shape."""
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

    # Static URL path served by FastAPI
    image_url = f"/media/{invitation_id}/scene_{idx}.png" if has_image else ""

    text_layer = scene.get("text_layer")
    if not text_layer:
        text_layer = build_default_text_layer(scene, inv_input)

    animation_plan = scene.get("animation_plan")
    has_video = bool(scene.get("video_path"))
    if not animation_plan:
        animation_plan = {
            "objectsDetected": [],
            "keepStationary": [],
            "shouldMove": [],
            "cameraMovement": "Static",
            "grokPrompt": scene.get("video_prompt", ""),
            "videoStatus": "done" if has_video else "idle",
            "videoProgress": 100 if has_video else 0,
        }
    elif has_video and animation_plan.get("videoStatus") != "done":
        animation_plan["videoStatus"] = "done"
        animation_plan["videoProgress"] = 100

    return {
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
    }


# ── Background Task Workers ───────────────────────────────────────────────────

def run_create_scenes_task(invitation_id: str, inv_input: dict[str, Any]) -> None:
    """Stage 1: split_scenes -> style_bible -> build_prompts -> stage1_done."""
    try:
        logger.info(f"[{invitation_id}] Starting Stage 1: create_scenes")
        st = load_state(invitation_id)
        st["status"] = "running"
        save_state(invitation_id, st)

        # 1. split_scenes
        split_res = split_scenes({"invitation_id": invitation_id, "input": inv_input})
        st = load_state(invitation_id)
        scenes = st["scenes"]

        # 2. style_bible
        bible_res = style_bible({"invitation_id": invitation_id, "input": inv_input})
        st = load_state(invitation_id)

        # 3. build_prompt_scene in parallel
        prompt_results = []
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future_to_idx = {
                executor.submit(
                    build_prompt_scene,
                    {
                        "invitation_id": invitation_id,
                        "input": inv_input,
                        "style_bible": st["style_bible"],
                        "_current_scene": sc,
                    },
                ): sc["scene_index"]
                for sc in scenes
            }
            for future in concurrent.futures.as_completed(future_to_idx):
                res = future.result()
                prompt_results.extend(res["_prompt_results"])

        # 4. collect_prompts & initialize default text_layer
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
    """Helper to generate one image and run text layout for that scene."""
    idx = scene["scene_index"]
    try:
        out = get_image_path(invitation_id, idx)
        _generate_one_image(scene["image_prompt"], out, prev_b64)
        img_rel = rel(out)

        # Run layout
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
        update_scene(invitation_id, idx, status="failed")
        return idx, False, None


def run_generate_images_task(invitation_id: str, story_driven: bool) -> None:
    """Stage 2: generate_images -> layout_text for each scene."""
    try:
        logger.info(f"[{invitation_id}] Starting Stage 2: generate_images (story_driven={story_driven})")
        st = load_state(invitation_id)
        st["status"] = "running"
        save_state(invitation_id, st)

        scenes = sorted(st["scenes"], key=lambda s: s["scene_index"])
        inv_input = st["input"]
        bible = st["style_bible"]

        # Mark all scenes as generating
        for s in scenes:
            update_scene(invitation_id, s["scene_index"], status="generating")

        if story_driven:
            prev_b64: Optional[str] = None
            for sc in scenes:
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
                    for sc in scenes
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
    """Regenerates a single scene's background image and updates text layout."""
    try:
        update_scene(invitation_id, scene_index, status="generating")
        node_regenerate_image(invitation_id, scene_index, prompt)

        # Refresh text layout with new image
        st = load_state(invitation_id)
        scene = next(s for s in st["scenes"] if s["scene_index"] == scene_index)
        layout_res = layout_text_scene({
            "invitation_id": invitation_id,
            "input": st["input"],
            "style_bible": st["style_bible"],
            "_current_scene": scene,
        })
        text_layer = layout_res["_layout_results"][0]["text_layer"]
        update_scene(invitation_id, scene_index, text_layer=text_layer, status="done")
    except Exception as err:
        logger.error(f"[{invitation_id}] Scene {scene_index} regenerate failed: {err}")
        update_scene(invitation_id, scene_index, status="failed")


def run_generate_video_task(invitation_id: str, scene_index: int) -> None:
    """Calls Grok for a single scene and saves the generated MP4."""
    try:
        generate_video_for_scene(invitation_id, scene_index)
    except Exception as err:
        logger.error(f"[{invitation_id}] Scene {scene_index} video generation failed: {err}")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.post("/api/create-scenes", status_code=status.HTTP_202_ACCEPTED)
def create_scenes_endpoint(req: CreateScenesRequest, background_tasks: BackgroundTasks) -> dict[str, Any]:
    """
    Corresponds to api.ts:createScenes.
    Saves invitation, kicks off Stage 1 (split, style_bible, prompts) in background.
    """
    raw_inv = req.invitation
    inv_id = str(raw_inv.get("id") or uuid.uuid4().hex[:8])
    backend_input = frontend_to_backend_input(raw_inv)

    create_invitation(inv_id, backend_input)
    background_tasks.add_task(run_create_scenes_task, inv_id, backend_input)

    return {"invitation_id": inv_id, "status": "running"}


@app.post("/api/generate-images", status_code=status.HTTP_202_ACCEPTED)
def generate_images_endpoint(req: GenerateImagesRequest, background_tasks: BackgroundTasks) -> dict[str, Any]:
    """
    Corresponds to api.ts:generateImages.
    Generates 9:16 background artwork and runs text layout for each scene.
    """
    try:
        load_state(req.invitation_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Invitation {req.invitation_id} not found")

    background_tasks.add_task(run_generate_images_task, req.invitation_id, req.story_driven)
    return {"invitation_id": req.invitation_id, "status": "running"}


@app.post("/api/regenerate-image", status_code=status.HTTP_202_ACCEPTED)
def regenerate_image_endpoint(req: RegenerateImageRequest, background_tasks: BackgroundTasks) -> dict[str, Any]:
    """
    Corresponds to api.ts:regenerateImage and editImageWithInstruction.
    """
    try:
        st = load_state(req.invitation_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Invitation {req.invitation_id} not found")

    scene = next((s for s in st["scenes"] if s["scene_index"] == req.scene_index), None)
    if not scene:
        raise HTTPException(status_code=404, detail=f"Scene {req.scene_index} not found")

    final_prompt = req.custom_prompt
    if req.instruction and req.instruction.strip():
        base = req.custom_prompt or scene.get("image_prompt", "")
        final_prompt = f"{base} Refined: {req.instruction.strip()}"

    background_tasks.add_task(run_regenerate_image_task, req.invitation_id, req.scene_index, final_prompt)
    return {"invitation_id": req.invitation_id, "scene_index": req.scene_index, "status": "running"}


@app.post("/api/analyze-image")
def analyze_image_endpoint(req: AnalyzeImageRequest) -> dict[str, Any]:
    """
    Corresponds to api.ts:analyzeImage.
    Runs vision analysis on scene image; returns structured AnimationPlan.
    """
    try:
        plan = analyze_one_scene(req.invitation_id, req.scene_index, req.animation_note)
        return plan
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Invitation or scene image not found")
    except Exception as exc:
        logger.error(f"analyze-image error: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/generate-video", status_code=status.HTTP_202_ACCEPTED)
def generate_video_endpoint(req: GenerateVideoRequest, background_tasks: BackgroundTasks) -> dict[str, Any]:
    """
    Corresponds to api.ts:generateVideo.
    Triggers Grok video generation for a single scene in the background.
    """
    try:
        load_state(req.invitation_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Invitation {req.invitation_id} not found")

    background_tasks.add_task(run_generate_video_task, req.invitation_id, req.scene_index)
    return {"invitation_id": req.invitation_id, "scene_index": req.scene_index, "status": "queued"}


@app.get("/api/invitations/{invitation_id}/status")
def get_invitation_status(invitation_id: str) -> dict[str, Any]:
    """
    Polling endpoint returning overall invitation status and per-scene statuses.
    """
    try:
        st = load_state(invitation_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Invitation {invitation_id} not found")

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

        scenes_status.append({
            "id": f"sc-{invitation_id}-{idx}",
            "scene_index": idx,
            "order": idx + 1,
            "title": s.get("scene_purpose", f"Scene {idx + 1}"),
            "image_status": img_status,
            "video_status": v_status,
            "video_progress": v_progress,
            "image_url": f"/media/{invitation_id}/scene_{idx}.png" if has_image else None,
            "video_url": f"/media/{invitation_id}/scene_{idx}.mp4" if has_video else None,
        })

    return {
        "invitation_id": invitation_id,
        "status": inv_status,
        "scenes": scenes_status,
    }


@app.get("/api/invitations/{invitation_id}")
def get_invitation(invitation_id: str) -> dict[str, Any]:
    """
    Returns style bible and complete scenes for the invitation.
    """
    try:
        st = load_state(invitation_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Invitation {invitation_id} not found")

    inv_input = st.get("input", {})
    scenes = [
        backend_scene_to_frontend(s, invitation_id, inv_input)
        for s in sorted(st.get("scenes", []), key=lambda x: x["scene_index"])
    ]

    return {
        "invitation_id": invitation_id,
        "style_bible": st.get("style_bible"),
        "scenes": scenes,
    }


@app.patch("/api/invitations/{invitation_id}/scenes/{scene_index}")
def patch_scene(invitation_id: str, scene_index: int, req: PatchSceneRequest) -> dict[str, Any]:
    """
    Plain DB update for scene text_layer, image_prompt, video_prompt, or animation_note.
    No AI model is invoked.
    """
    try:
        st = load_state(invitation_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Invitation {invitation_id} not found")

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
    if req.animation_note is not None:
        fields_to_update["animation_note"] = req.animation_note

    if fields_to_update:
        update_scene(invitation_id, scene_index, **fields_to_update)

    # Reload fresh state
    fresh_st = load_state(invitation_id)
    updated_scene = next(s for s in fresh_st["scenes"] if s["scene_index"] == scene_index)
    return {
        "invitation_id": invitation_id,
        "scene": backend_scene_to_frontend(updated_scene, invitation_id, fresh_st.get("input", {})),
    }

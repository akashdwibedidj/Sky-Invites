"""
graph2/nodes.py
Node functions for Graph 2: analyze_image and generate_video_scene.
Assumes backend/ is on sys.path (run_graph2.py adds it).
"""

import json
import logging
import os
import re
from pathlib import Path
from typing import Any

from openai import OpenAI
from langsmith.wrappers import wrap_openai

from config import VISION_LLM_MODEL
from prompts import ANALYZE_IMAGE, ANIMATION_NOTE_SECTION
from storage import PROJECT_ROOT, rel, load_state, save_state
from storage import video_path as vid_path
import grok

logger = logging.getLogger("graph2.nodes")

_client = wrap_openai(OpenAI(api_key=os.environ["OPENAI_API_KEY"]))


# ── Helpers ───────────────────────────────────────────────────────────────────

def _vision(prompt: str, image_b64: str) -> str:
    import base64
    resp = _client.responses.create(
        model=VISION_LLM_MODEL,
        input=[{
            "role": "user",
            "content": [
                {"type": "input_text",  "text": prompt},
                {"type": "input_image", "image_url": f"data:image/png;base64,{image_b64}"},
            ],
        }],
    )
    return resp.output_text.strip()


def _file_to_b64(path: Path) -> str:
    import base64
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def _extract_camera_movement(user_note: str) -> str:
    """
    Absolute Camera Rule:
    Camera movement is STATIC by default.
    Requests to animate objects NEVER trigger camera movement.
    Only an explicit camera request in the note may enable one of the allowed camera values.
    """
    note = (user_note or "").lower()
    if "slow zoom in" in note or "zoom in" in note:
        return "Slow zoom in"
    if "parallax" in note:
        return "Parallax"
    if "pan left/right" in note or "pan left" in note or "pan right" in note or "pan" in note:
        return "Pan left/right"
    return "Static"


def _clean_plain_words(text: str, default: str) -> str:
    """Removes numerical multipliers like 0.25x or percentages, replacing with plain descriptive words."""
    t = str(text or "").strip().lower()
    t = re.sub(r"\b0\.\d+x\b", "", t)
    t = re.sub(r"\b\d+x\b", "", t)
    t = re.sub(r"\b\d+%\b", "", t)
    t = t.strip(" ()-–,")
    return t if t else default


def format_should_move_as_strings(should_move: list[Any]) -> list[str]:
    """Converts structured shouldMove list into string[] expected by the frontend."""
    res: list[str] = []
    for item in should_move:
        if isinstance(item, dict):
            obj = item.get("object", "element")
            m_type = item.get("motionType", "subtle motion")
            direction = item.get("direction", "ambient")
            intensity = item.get("intensity", "subtle")
            speed = item.get("speed", "slow")
            res.append(f"{obj}: {m_type} {direction} ({intensity}, {speed})")
        elif isinstance(item, str) and item.strip():
            res.append(item.strip())
    return res


def sanitize_animation_plan(parsed: dict[str, Any], user_note: str) -> dict[str, Any]:
    """
    Validates the LLM animation plan output:
    1. shouldMove objects MUST exist in objectsDetected.
    2. Camera is Static unless user explicitly asked for camera movement.
    3. Plain words for intensity and speed.
    4. If shouldMove is empty and camera is Static, sets videoStatus='done' and videoProgress=100.
    """
    raw_objects = parsed.get("objectsDetected") or []
    objects_detected = [str(o).strip() for o in raw_objects if str(o).strip()]

    raw_stationary = parsed.get("keepStationary") or []
    keep_stationary = [str(k).strip() for k in raw_stationary if str(k).strip()]

    raw_should_move = parsed.get("shouldMove") or []
    clean_should_move: list[dict[str, str]] = []

    for item in raw_should_move:
        if isinstance(item, dict):
            obj_name = str(item.get("object") or "").strip()
            if not obj_name:
                continue

            # Check if object exists in objects_detected (case-insensitive substring check)
            obj_lower = obj_name.lower()
            detected_match = any(
                obj_lower in d.lower() or d.lower() in obj_lower
                for d in objects_detected
            )
            if not detected_match:
                # Disallow hallucinated objects not present in objectsDetected
                continue

            clean_should_move.append({
                "object": obj_name,
                "reason": str(item.get("reason") or "subtle organic movement").strip(),
                "motionType": str(item.get("motionType") or "drift").strip(),
                "direction": str(item.get("direction") or "ambient").strip(),
                "intensity": _clean_plain_words(item.get("intensity"), "subtle"),
                "speed": _clean_plain_words(item.get("speed"), "slow"),
            })

    # Absolute camera rule enforcement
    camera_movement = _extract_camera_movement(user_note)

    # If no movable objects and camera is static, scene video is immediately ready (no Grok call needed)
    is_static = (len(clean_should_move) == 0 and camera_movement == "Static")
    video_status = "done" if is_static else "idle"
    video_progress = 100 if is_static else 0

    grok_prompt = str(parsed.get("grokPrompt") or "").strip()

    return {
        "objectsDetected": objects_detected,
        "keepStationary": keep_stationary,
        "shouldMove": clean_should_move,
        "cameraMovement": camera_movement,
        "animationMode": "selective_object_animation",
        "grokPrompt": grok_prompt,
        "videoStatus": video_status,
        "videoProgress": video_progress,
    }


# ── Node 1: analyze_image (parallel worker, called via Send) ──────────────────

def analyze_image(state: dict) -> dict:
    """
    Vision model inspects one scene image and writes structured animation plan & Grok prompt.
    Runs in parallel via LangGraph Send — one worker per scene.
    """
    scene = state["_current_scene"]
    image_full_path = PROJECT_ROOT / scene["image_path"]

    animation_note = scene.get("animation_note", "").strip()
    note_section = (
        ANIMATION_NOTE_SECTION.format(animation_note=animation_note)
        if animation_note
        else ""
    )

    prompt = ANALYZE_IMAGE.format(
        animation_note_section=note_section,
    )

    img_b64 = _file_to_b64(image_full_path)
    raw = _vision(prompt, img_b64)
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]).strip()
    try:
        parsed = json.loads(text)
    except Exception:
        parsed = {}

    plan = sanitize_animation_plan(parsed, animation_note)

    return {
        "_video_prompt_results": [
            {
                "scene_index": scene["scene_index"],
                "video_prompt": plan["grokPrompt"],
                "animation_plan": plan,
            }
        ],
    }


def collect_video_prompts(state: dict) -> dict:
    """Merges parallel analyze_image results into scenes and saves state."""
    plan_map = {r["scene_index"]: r["animation_plan"] for r in state["_video_prompt_results"]}
    prompt_map = {r["scene_index"]: r["video_prompt"] for r in state["_video_prompt_results"]}
    updated = [
        {
            **scene,
            "video_prompt": prompt_map[scene["scene_index"]],
            "animation_plan": plan_map[scene["scene_index"]],
        }
        for scene in state["scenes"]
    ]

    st = load_state(state["invitation_id"])
    st["scenes"] = updated
    save_state(state["invitation_id"], st)

    return {"scenes": updated}


def analyze_one_scene(invitation_id: str, scene_index: int, animation_note: str | None = None) -> dict:
    """Analyze one scene image, save rich plan in DB, and return frontend AnimationPlan."""
    st = load_state(invitation_id)
    scene = next(s for s in st["scenes"] if s["scene_index"] == scene_index)
    image_full_path = PROJECT_ROOT / scene["image_path"]

    note = (animation_note if animation_note is not None else scene.get("animation_note", "")).strip()
    note_section = (
        ANIMATION_NOTE_SECTION.format(animation_note=note)
        if note
        else ""
    )

    prompt = ANALYZE_IMAGE.format(
        animation_note_section=note_section,
    )

    img_b64 = _file_to_b64(image_full_path)
    raw = _vision(prompt, img_b64)
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]).strip()
    try:
        parsed = json.loads(text)
    except Exception:
        parsed = {}

    rich_plan = sanitize_animation_plan(parsed, note)

    # Save rich plan to scene in DB
    scene["animation_plan"] = rich_plan
    scene["video_prompt"] = rich_plan["grokPrompt"]
    if animation_note is not None:
        scene["animation_note"] = animation_note
    st["scenes"] = [
        scene if s["scene_index"] == scene_index else s
        for s in st["scenes"]
    ]
    save_state(invitation_id, st)

    # Return frontend-compatible AnimationPlan with shouldMove as string[]
    frontend_plan = dict(rich_plan)
    frontend_plan["shouldMove"] = format_should_move_as_strings(rich_plan.get("shouldMove", []))
    return frontend_plan


# ── Node 2: generate_video_scene (parallel worker, called via Send) ───────────

def generate_video_scene(state: dict) -> dict:
    """
    Sends image + video_prompt to Grok, waits for the clip, saves it.
    If shouldMove is empty and camera is Static, Grok is NOT called.
    """
    scene = state["_current_scene"]
    invitation_id = state["invitation_id"]
    idx = scene["scene_index"]

    plan = scene.get("animation_plan") or {}
    should_move = plan.get("shouldMove") or []
    camera_movement = plan.get("cameraMovement") or "Static"

    # Rule 1: If shouldMove is empty and camera is Static, do NOT call Grok.
    if len(should_move) == 0 and camera_movement == "Static":
        logger.info(f"[{invitation_id}] Scene {idx} has no movable objects and static camera; skipping Grok call.")
        return {
            "_video_path_results": [
                {"scene_index": idx, "video_path": None}
            ],
        }

    image_full_path = PROJECT_ROOT / scene["image_path"]
    output_path = vid_path(invitation_id, idx)

    grok.generate_video(
        image_path=image_full_path,
        video_prompt=scene["video_prompt"],
        output_path=output_path,
    )

    return {
        "_video_path_results": [
            {"scene_index": idx, "video_path": rel(output_path)}
        ],
    }


def collect_videos(state: dict) -> dict:
    """Merges parallel video results into scenes and saves final state."""
    path_map = {r["scene_index"]: r["video_path"] for r in state["_video_path_results"]}
    updated = [
        {**scene, "video_path": path_map[scene["scene_index"]]}
        for scene in state["scenes"]
    ]

    st = load_state(state["invitation_id"])
    st["scenes"] = updated
    save_state(state["invitation_id"], st)

    return {"scenes": updated}


def generate_video_for_scene(invitation_id: str, scene_index: int) -> str:
    """
    Generate video for a single scene via Grok and save result.
    If shouldMove is empty and camera is Static, do NOT call Grok; mark done immediately.
    """
    st = load_state(invitation_id)
    scene = next(s for s in st["scenes"] if s["scene_index"] == scene_index)

    # 1. Ensure scene has been analyzed first! If not, run vision analysis.
    if not scene.get("animation_plan") or not scene.get("video_prompt"):
        logger.info(f"[{invitation_id}] Scene {scene_index} has no animation plan; running vision analysis first...")
        analyze_one_scene(invitation_id, scene_index, scene.get("animation_note"))
        st = load_state(invitation_id)
        scene = next(s for s in st["scenes"] if s["scene_index"] == scene_index)

    plan = scene.get("animation_plan") or {}
    should_move = plan.get("shouldMove") or []
    camera_movement = plan.get("cameraMovement") or "Static"

    # Rule 1: If shouldMove is empty and camera is Static, do NOT call Grok.
    if len(should_move) == 0 and camera_movement == "Static":
        logger.info(f"[{invitation_id}] Scene {scene_index} has no movable objects and static camera; skipping Grok call.")
        scene["video_path"] = None
        if not scene.get("animation_plan"):
            scene["animation_plan"] = {}
        scene["animation_plan"]["videoStatus"] = "done"
        scene["animation_plan"]["videoProgress"] = 100
        save_state(invitation_id, st)
        return ""

    image_full_path = PROJECT_ROOT / scene["image_path"]
    output_path = vid_path(invitation_id, scene_index)

    if not scene.get("animation_plan"):
        scene["animation_plan"] = {}
    scene["animation_plan"]["videoStatus"] = "generating"
    scene["animation_plan"]["videoProgress"] = 20
    save_state(invitation_id, st)

    try:
        grok.generate_video(
            image_path=image_full_path,
            video_prompt=scene["video_prompt"],
            output_path=output_path,
        )
        relative_vid = rel(output_path)
        scene["video_path"] = relative_vid
        scene["animation_plan"]["videoStatus"] = "done"
        scene["animation_plan"]["videoProgress"] = 100
        save_state(invitation_id, st)
        return relative_vid
    except Exception as e:
        logger.error(f"[{invitation_id}] generate_video_for_scene {scene_index} error: {e}", exc_info=True)
        try:
            st = load_state(invitation_id)
            scene = next(s for s in st["scenes"] if s["scene_index"] == scene_index)
            if not scene.get("animation_plan"):
                scene["animation_plan"] = {}
            scene["animation_plan"]["videoStatus"] = "failed"
            scene["animation_plan"]["videoProgress"] = 0
            save_state(invitation_id, st)
        except Exception:
            pass
        raise e

"""
graph2/nodes.py
Node functions for Graph 2: analyze_image and generate_video_scene.
Assumes backend/ is on sys.path (run_graph2.py adds it).
"""

import json
import os
from pathlib import Path

from openai import OpenAI
from langsmith.wrappers import wrap_openai

from config import VISION_LLM_MODEL
from prompts import ANALYZE_IMAGE, ANIMATION_NOTE_SECTION
from storage import PROJECT_ROOT, rel, load_state, save_state
from storage import video_path as vid_path
import grok


_client = wrap_openai(OpenAI(api_key=os.environ["OPENAI_API_KEY"]))


# ── Helpers ───────────────────────────────────────────────────────────────────

def _vision(prompt: str, image_b64: str) -> str:
    import base64  # already in scope via caller but kept explicit
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


# ── Node 1: analyze_image (parallel worker, called via Send) ──────────────────

def analyze_image(state: dict) -> dict:
    """
    Vision model inspects one scene image and writes the Grok video prompt.
    Runs in parallel via LangGraph Send — one worker per scene.

    Reads: state["_current_scene"]["image_path"]  (relative to project root)
           state["_current_scene"]["animation_note"]  (optional — set by user in state.json)
    Returns: {"_video_prompt_results": [{"scene_index": i, "video_prompt": "..."}]}
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
        invitation_type=state["input"]["invitation_type"],
        style_bible_json=json.dumps(state["style_bible"], indent=2),
        animation_note_section=note_section,
    )

    img_b64 = _file_to_b64(image_full_path)
    video_prompt = _vision(prompt, img_b64)

    return {
        "_video_prompt_results": [
            {"scene_index": scene["scene_index"], "video_prompt": video_prompt}
        ],
    }


def collect_video_prompts(state: dict) -> dict:
    """Merges parallel analyze_image results into scenes and saves state."""
    prompt_map = {r["scene_index"]: r["video_prompt"] for r in state["_video_prompt_results"]}
    updated = [
        {**scene, "video_prompt": prompt_map[scene["scene_index"]]}
        for scene in state["scenes"]
    ]

    st = load_state(state["invitation_id"])
    st["scenes"] = updated
    save_state(state["invitation_id"], st)

    return {"scenes": updated}


# ── Node 2: generate_video_scene (parallel worker, called via Send) ───────────

def generate_video_scene(state: dict) -> dict:
    """
    Sends image + video_prompt to Grok, waits for the clip, saves it.
    Runs in parallel via LangGraph Send — one worker per scene.

    Reads: state["_current_scene"]["image_path"]   (relative to project root)
           state["_current_scene"]["video_prompt"]  (set by analyze_image; user may have edited it)
    Returns: {"_video_path_results": [{"scene_index": i, "video_path": "..."}]}
    """
    scene = state["_current_scene"]
    invitation_id = state["invitation_id"]
    idx = scene["scene_index"]

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

"""
graph1/nodes.py
All node functions for Graph 1.
Assumes backend/ is on sys.path (run_graph1.py adds it).
"""

import base64
import concurrent.futures
import json
import os
from io import BytesIO
from pathlib import Path

from openai import OpenAI
from langsmith import traceable
from langsmith.wrappers import wrap_openai
from PIL import Image

from config import (
    TEXT_LLM_MODEL,
    VISION_LLM_MODEL,
    IMAGE_MODEL,
    IMAGE_SIZE,
    IMAGE_FINAL_SIZE,
    IMAGE_QUALITY,
    ALLOWED_FONTS,
)
from prompts import SPLIT_SCENES, STYLE_BIBLE, BUILD_PROMPT, LAYOUT_TEXT
from storage import image_path as img_path, rel, load_state, save_state


# wrap_openai patches the client so every responses.create / images.generate
# call is automatically traced to LangSmith. Tracing is controlled by the
# LANGSMITH_TRACING env var — set it to "false" to disable without code changes.
_client = wrap_openai(OpenAI(api_key=os.environ["OPENAI_API_KEY"]))


# ── LLM helpers ───────────────────────────────────────────────────────────────

def _llm(prompt: str) -> str:
    """Text-only call via the Responses API."""
    resp = _client.responses.create(
        model=TEXT_LLM_MODEL,
        input=[{"role": "user", "content": [{"type": "input_text", "text": prompt}]}],
    )
    return resp.output_text.strip()


def _vision(prompt: str, image_b64: str) -> str:
    """Vision call: text prompt + a base64-encoded PNG."""
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


def _parse_json(text: str):
    """Strip optional markdown fences then parse JSON."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]).strip()
    return json.loads(text)


def _file_to_b64(path: Path) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


@traceable(name="generate_image", metadata={"model": IMAGE_MODEL})
def _generate_one_image(prompt: str, out_path: Path, prev_b64: str | None = None) -> str:
    """
    Generate a single portrait image and save it at out_path.
    Returns the saved path (str) so LangSmith logs the path, not base64 data.
    prev_b64: if set (story_mode), appends a visual-continuity instruction.
    """
    if prev_b64 is not None:
        prompt = (
            prompt
            + " Maintain strict visual continuity with the previous scene: "
              "identical colour palette, same lighting conditions, same recurring motifs, "
              "same overall aesthetic. No deviation from the established visual world."
        )

    resp = _client.images.generate(
        model=IMAGE_MODEL,
        prompt=prompt,
        size=IMAGE_SIZE,
        quality=IMAGE_QUALITY,
    )
    item = resp.data[0]
    if getattr(item, "b64_json", None):
        raw = base64.b64decode(item.b64_json)
    elif getattr(item, "url", None):
        import requests
        raw = requests.get(item.url).content
    else:
        raise ValueError(f"Unexpected image response format: {item}")
    img = Image.open(BytesIO(raw))
    img_resized = img.resize(IMAGE_FINAL_SIZE, Image.Resampling.LANCZOS)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img_resized.save(str(out_path))
    return str(out_path)  # logged by LangSmith; base64 data is never returned


# ── Node 1: split_scenes ──────────────────────────────────────────────────────

def split_scenes(state: dict) -> dict:
    inv = state["input"]
    prompt = SPLIT_SCENES.format(
        num_scenes=inv["num_scenes"],
        invitation_json=json.dumps(inv, indent=2),
    )
    result = _parse_json(_llm(prompt))
    scenes = result["scenes"]

    st = load_state(state["invitation_id"])
    st["scenes"] = scenes
    save_state(state["invitation_id"], st)

    return {"scenes": scenes}


# ── Node 2: style_bible ───────────────────────────────────────────────────────

def style_bible(state: dict) -> dict:
    inv = state["input"]
    prompt = STYLE_BIBLE.format(
        invitation_type=inv["invitation_type"],
        invitation_json=json.dumps(inv, indent=2),
        style_description=inv["style_description"],
        theme=inv["theme"],
        style=inv["style"],
    )
    bible = _parse_json(_llm(prompt))

    st = load_state(state["invitation_id"])
    st["style_bible"] = bible
    save_state(state["invitation_id"], st)

    return {"style_bible": bible}


# ── Node 3: build_prompt_scene (parallel worker, called via Send) ─────────────

def build_prompt_scene(state: dict) -> dict:
    """Builds the image prompt for one scene. Runs in parallel via LangGraph Send."""
    scene = state["_current_scene"]
    inv = state["input"]

    prompt = BUILD_PROMPT.format(
        scene_index=scene["scene_index"],
        num_scenes=inv["num_scenes"],
        invitation_type=inv["invitation_type"],
        style_bible_json=json.dumps(state["style_bible"], indent=2),
        scene_purpose=scene["scene_purpose"],
        text_data_json=json.dumps(scene["text_data"], indent=2),
    )
    image_prompt = _llm(prompt)

    return {
        "_prompt_results": [
            {"scene_index": scene["scene_index"], "image_prompt": image_prompt}
        ],
    }


def collect_prompts(state: dict) -> dict:
    """Merges all parallel prompt results back into scenes, then saves."""
    prompt_map = {r["scene_index"]: r["image_prompt"] for r in state["_prompt_results"]}
    updated = [
        {**scene, "image_prompt": prompt_map[scene["scene_index"]]}
        for scene in state["scenes"]
    ]

    st = load_state(state["invitation_id"])
    st["scenes"] = updated
    save_state(state["invitation_id"], st)

    return {"scenes": updated}


# ── Node 4: generate_images ───────────────────────────────────────────────────

def generate_images(state: dict) -> dict:
    """
    Generates one image per scene.
      story_mode=False → parallel via ThreadPoolExecutor
      story_mode=True  → sequential; each scene gets the previous image's
                          b64 appended to its prompt as a continuity reference.
    """
    invitation_id = state["invitation_id"]
    scenes = sorted(state["scenes"], key=lambda s: s["scene_index"])
    story_mode = state["input"].get("story_mode", False)

    path_map: dict[int, str] = {}

    if story_mode:
        prev_b64: str | None = None
        for scene in scenes:
            out = img_path(invitation_id, scene["scene_index"])
            _generate_one_image(scene["image_prompt"], out, prev_b64)
            path_map[scene["scene_index"]] = rel(out)
            prev_b64 = _file_to_b64(out)
    else:
        def _task(scene):
            out = img_path(invitation_id, scene["scene_index"])
            _generate_one_image(scene["image_prompt"], out)
            return scene["scene_index"], rel(out)

        with concurrent.futures.ThreadPoolExecutor() as ex:
            for idx, path_str in ex.map(_task, scenes):
                path_map[idx] = path_str

    updated = [
        {**scene, "image_path": path_map[scene["scene_index"]]}
        for scene in scenes
    ]

    st = load_state(invitation_id)
    st["scenes"] = updated
    save_state(invitation_id, st)

    return {"scenes": updated}


# ── Node 5: layout_text_scene (parallel worker, called via Send) ──────────────

def layout_text_scene(state: dict) -> dict:
    """Runs the vision model to place the text layer on one scene image. Parallel via Send."""
    scene = state["_current_scene"]
    inv = state["input"]
    img_b64 = _file_to_b64(img_path(state["invitation_id"], scene["scene_index"]))

    heading_font = inv.get("heading_font") or inv.get("headingFont") or "Playfair Display"
    body_font = inv.get("body_font") or inv.get("bodyFont") or "Cormorant Garamond"

    prompt = LAYOUT_TEXT.format(
        invitation_type=inv.get("invitation_type", "wedding"),
        heading_font=heading_font,
        body_font=body_font,
        style_bible_json=json.dumps(state["style_bible"], indent=2),
        text_data_json=json.dumps(scene["text_data"], indent=2),
    )
    raw = _vision(prompt, img_b64)
    text_layer = _parse_json(raw)
    if isinstance(text_layer, dict):
        text_layer["headingFont"] = heading_font
        text_layer["bodyFont"] = body_font
        if "animation" not in text_layer:
            text_layer["animation"] = inv.get("text_animation") or inv.get("textAnimation") or "Slide-up"
        if "sequentialDelayMs" not in text_layer:
            text_layer["sequentialDelayMs"] = 250

    return {
        "_layout_results": [
            {"scene_index": scene["scene_index"], "text_layer": text_layer}
        ],
    }


def collect_layout(state: dict) -> dict:
    """Merges all parallel layout results back into scenes and saves final state."""
    layout_map = {r["scene_index"]: r.get("text_layer") for r in state["_layout_results"]}
    updated = [
        {**scene, "text_layer": layout_map.get(scene["scene_index"])}
        for scene in state["scenes"]
    ]

    st = load_state(state["invitation_id"])
    st["scenes"] = updated
    save_state(state["invitation_id"], st)

    return {"scenes": updated}


# ── Standalone: regenerate_image ──────────────────────────────────────────────

@traceable(name="regenerate_image")
def regenerate_image(invitation_id: str, scene_index: int, edited_prompt: str | None = None) -> str:
    """
    Regenerate the image for a single scene without re-running the full graph.
      edited_prompt=None  → rebuilds the prompt from the style bible + scene data.
      edited_prompt=str   → uses the provided prompt directly.
    Returns the relative path of the saved image (e.g. "media/abc123/scene_2.png").
    """
    st = load_state(invitation_id)
    inv = st["input"]
    scene = next(s for s in st["scenes"] if s["scene_index"] == scene_index)

    if edited_prompt is None:
        raw = BUILD_PROMPT.format(
            scene_index=scene_index,
            num_scenes=inv["num_scenes"],
            invitation_type=inv["invitation_type"],
            style_bible_json=json.dumps(st["style_bible"], indent=2),
            scene_purpose=scene["scene_purpose"],
            text_data_json=json.dumps(scene["text_data"], indent=2),
        )
        edited_prompt = _llm(raw)

    scene["image_prompt"] = edited_prompt
    out = img_path(invitation_id, scene_index)
    _generate_one_image(edited_prompt, out)
    scene["image_path"] = rel(out)

    # Patch scene back into state
    st["scenes"] = [
        scene if s["scene_index"] == scene_index else s
        for s in st["scenes"]
    ]
    save_state(invitation_id, st)

    return scene["image_path"]

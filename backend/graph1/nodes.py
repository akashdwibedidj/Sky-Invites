"""
graph1/nodes.py
All node functions for Graph 1.
Assumes backend/ is on sys.path (run_graph1.py adds it).
"""

import base64
import concurrent.futures
import json
import logging
import os
from io import BytesIO
from pathlib import Path
from typing import Any

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
    normalize_category,
    get_category_rules,
    build_identity_data,
    resolve_style_hierarchy,
    get_scene_composition_strategy,
)
from prompts import SPLIT_SCENES, STYLE_BIBLE, BUILD_PROMPT, LAYOUT_TEXT
from storage import image_path as img_path, rel, load_state, save_state

logger = logging.getLogger("graph1.nodes")

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


def _parse_json(text: str) -> Any:
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


# ── Text data & lines conversion ──────────────────────────────────────────────

def build_lines_from_text_data(text_data: dict[str, Any], scene_index: int) -> list[dict[str, str]]:
    """
    Deterministically maps scene text_data to an array of TextLine dicts:
    role: 'kicker' | 'heading' | 'subheading' | 'detail' | 'footer'
    Supports both new schema and backward-compatible legacy schema.
    """
    if not isinstance(text_data, dict):
        return []

    lines: list[dict[str, str]] = []

    # Backward compatibility: old schema check (headline, sublines, note)
    if "headline" in text_data and "heading" not in text_data:
        headline = str(text_data.get("headline") or "").strip()
        if headline:
            lines.append({"id": f"l-{scene_index}-h", "role": "heading", "text": headline})
        for s_idx, sub in enumerate(text_data.get("sublines") or []):
            sub_str = str(sub).strip()
            if sub_str:
                lines.append({"id": f"l-{scene_index}-s-{s_idx}", "role": "subheading" if s_idx == 0 else "detail", "text": sub_str})
        note = str(text_data.get("note") or "").strip()
        if note:
            lines.append({"id": f"l-{scene_index}-n", "role": "detail", "text": note})
        return lines

    # New schema: kicker, heading, subheading, body_lines, details, date, time, venue, footer
    kicker = str(text_data.get("kicker") or "").strip()
    if kicker:
        lines.append({"id": f"l-{scene_index}-kicker", "role": "kicker", "text": kicker})

    heading = str(text_data.get("heading") or "").strip()
    if heading:
        lines.append({"id": f"l-{scene_index}-heading", "role": "heading", "text": heading})

    subheading = str(text_data.get("subheading") or "").strip()
    if subheading:
        lines.append({"id": f"l-{scene_index}-subheading", "role": "subheading", "text": subheading})

    for b_idx, body in enumerate(text_data.get("body_lines") or []):
        body_str = str(body).strip()
        if body_str:
            lines.append({"id": f"l-{scene_index}-body-{b_idx}", "role": "detail", "text": body_str})

    for d_idx, detail in enumerate(text_data.get("details") or []):
        det_str = str(detail).strip()
        if det_str:
            lines.append({"id": f"l-{scene_index}-detail-{d_idx}", "role": "detail", "text": det_str})

    # Date / Time / Venue
    date_val = str(text_data.get("date") or "").strip()
    time_val = str(text_data.get("time") or "").strip()
    if date_val and time_val:
        lines.append({"id": f"l-{scene_index}-datetime", "role": "detail", "text": f"{date_val} · {time_val}"})
    elif date_val:
        lines.append({"id": f"l-{scene_index}-date", "role": "detail", "text": date_val})
    elif time_val:
        lines.append({"id": f"l-{scene_index}-time", "role": "detail", "text": time_val})

    venue_val = str(text_data.get("venue") or "").strip()
    if venue_val:
        lines.append({"id": f"l-{scene_index}-venue", "role": "detail", "text": venue_val})

    footer = str(text_data.get("footer") or "").strip()
    if footer:
        lines.append({"id": f"l-{scene_index}-footer", "role": "footer", "text": footer})

    return lines


def build_text_layer(
    scene: dict[str, Any],
    inv_input: dict[str, Any],
    layout_params: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Constructs a complete frontend TextLayer object.
    Lines are generated deterministically from text_data.
    Placement and styling come from vision LLM (or defaults).
    Fonts are strictly enforced from user's design settings.
    """
    scene_idx = scene.get("scene_index", 0)
    text_data = scene.get("text_data") or {}
    lines = build_lines_from_text_data(text_data, scene_idx)

    # Fallback line if entirely empty
    if not lines:
        purpose = scene.get("scene_purpose") or "Celebration"
        lines = [{"id": f"l-{scene_idx}-heading", "role": "heading", "text": purpose}]

    lp = layout_params or {}
    placement = lp.get("placement") if lp.get("placement") in ("top", "center", "bottom") else "center"
    alignment = lp.get("alignment") if lp.get("alignment") in ("left", "center", "right") else "center"
    x_offset = int(max(-35, min(35, lp.get("xOffset", 0))))
    y_offset = int(max(-40, min(40, lp.get("yOffset", 0))))
    font_size = int(max(14, min(32, lp.get("fontSize", 22))))
    color = str(lp.get("color") or "#FAF6EE")

    heading_font = inv_input.get("heading_font") or inv_input.get("headingFont") or "Playfair Display"
    body_font = inv_input.get("body_font") or inv_input.get("bodyFont") or "Cormorant Garamond"
    animation = inv_input.get("text_animation") or inv_input.get("textAnimation") or "Slide-up"

    return {
        "lines": lines,
        "headingFont": heading_font,
        "bodyFont": body_font,
        "fontSize": font_size,
        "color": color,
        "alignment": alignment,
        "placement": placement,
        "xOffset": x_offset,
        "yOffset": y_offset,
        "animation": animation,
        "sequentialDelayMs": 250,
    }


# ── Node 1: split_scenes ──────────────────────────────────────────────────────

def _build_scene_count_rules(num_scenes: int) -> str:
    if num_scenes <= 2:
        return (
            "- Scene 0 (Identity + Highlights): Celebrant/host identity and key event summary.\n"
            "- Scene 1 (Logistics + Closing): Event date, time, venue, address, and warm closing/RSVP."
        )
    elif num_scenes == 3:
        return (
            "- Scene 0 (Identity): Who/what the invitation is for (names and event title).\n"
            "- Scene 1 (Programme): Ceremonies, agenda, and key highlights.\n"
            "- Scene 2 (Logistics & Closing): Date, time, venue, address, and warm closing/RSVP."
        )
    elif num_scenes == 4:
        return (
            "- Scene 0 (Identity): Who/what the invitation is for (names and event title).\n"
            "- Scene 1 (Programme): Ceremonies, agenda, and key highlights.\n"
            "- Scene 2 (Logistics): Date, time, venue, and address.\n"
            "- Scene 3 (Closing): Warm closing sentiment and RSVP/registration."
        )
    else:
        extra_count = num_scenes - 3
        return (
            f"- Scene 0 (Identity): Who/what the invitation is for (names and event title).\n"
            f"- Scenes 1 to {extra_count} (Programme): Distribute ceremonies/agenda items across separate scenes.\n"
            f"- Scene {num_scenes - 2} (Logistics): Date, time, venue, and address.\n"
            f"- Scene {num_scenes - 1} (Closing): Warm closing sentiment and RSVP/registration."
        )


def _validate_and_sanitize_scenes(raw_scenes: list[dict[str, Any]], num_scenes: int, inv: dict[str, Any]) -> list[dict[str, Any]]:
    """
    Enforces exact scene count, 0-based indexing, deterministic identity in Scene 0,
    and fact preservation against the original invitation input.
    """
    category = normalize_category(inv.get("invitation_type"))
    identity_facts = build_identity_data(category, inv)

    # 1. Ensure exact scene count
    sanitized: list[dict[str, Any]] = []
    for idx in range(num_scenes):
        if idx < len(raw_scenes) and isinstance(raw_scenes[idx], dict):
            sc = dict(raw_scenes[idx])
        else:
            role = "identity" if idx == 0 else ("closing" if idx == num_scenes - 1 else "programme")
            sc = {
                "scene_index": idx,
                "scene_role": role,
                "scene_purpose": f"Scene {idx + 1}",
                "visual_direction": "Elegant stationery background artwork with soft negative space for text",
                "text_data": {},
            }
        sc["scene_index"] = idx
        if "scene_role" not in sc:
            sc["scene_role"] = "identity" if idx == 0 else ("closing" if idx == num_scenes - 1 else "programme")
        if "visual_direction" not in sc:
            sc["visual_direction"] = "Luxury stationery backdrop with gentle negative space"

        td = sc.get("text_data")
        if not isinstance(td, dict):
            td = {}

        # Standardize text_data keys
        standard_td = {
            "kicker": str(td.get("kicker") or "").strip(),
            "heading": str(td.get("heading") or "").strip(),
            "subheading": str(td.get("subheading") or "").strip(),
            "body_lines": [str(b).strip() for b in td.get("body_lines", []) if str(b).strip()],
            "details": [str(d).strip() for d in td.get("details", []) if str(d).strip()],
            "date": str(td.get("date") or "").strip(),
            "time": str(td.get("time") or "").strip(),
            "venue": str(td.get("venue") or "").strip(),
            "footer": str(td.get("footer") or "").strip(),
        }

        # 2. Scene 0 Identity Enforcement (deterministic by CODE)
        if idx == 0:
            if identity_facts["heading"]:
                # Programmatically enforce true supplied names / title
                standard_td["heading"] = identity_facts["heading"]
            if identity_facts["subheading"] and not standard_td["subheading"]:
                standard_td["subheading"] = identity_facts["subheading"]
            if identity_facts["kicker"] and not standard_td["kicker"]:
                standard_td["kicker"] = identity_facts["kicker"]

        # 3. Fact Preservation Check against original events input
        events = inv.get("events") or []
        supplied_dates = {str(e.get("date") or "").strip() for e in events if str(e.get("date") or "").strip()}
        supplied_times = {str(e.get("time") or "").strip() for e in events if str(e.get("time") or "").strip()}
        supplied_venues = {str(e.get("venue") or "").strip() for e in events if str(e.get("venue") or "").strip()}

        if standard_td["date"] and standard_td["date"] not in supplied_dates:
            standard_td["date"] = ""
        if standard_td["time"] and standard_td["time"] not in supplied_times:
            standard_td["time"] = ""
        if standard_td["venue"] and not any(standard_td["venue"].lower() in v.lower() or v.lower() in standard_td["venue"].lower() for v in supplied_venues if v):
            standard_td["venue"] = ""

        user_msg = str(inv.get("message") or "").lower()
        if "rsvp" in standard_td["footer"].lower() and "rsvp" not in user_msg and not inv.get("host_name"):
            if not standard_td["footer"] or "by " in standard_td["footer"].lower() or "contact" in standard_td["footer"].lower():
                standard_td["footer"] = "Warmly requesting your presence"

        sc["text_data"] = standard_td
        sanitized.append(sc)

    return sanitized


def split_scenes(state: dict) -> dict:
    inv = state["input"]
    category = normalize_category(inv.get("invitation_type"))
    cat_rules = get_category_rules(category)
    num_scenes = int(inv.get("num_scenes") or 4)

    cat_rules_text = (
        f"- Category: {cat_rules.get('label', category.title())}\n"
        f"- Scene 1 (Identity): {cat_rules.get('s1_identity', '')}\n"
        f"- Scene 2 (Programme): {cat_rules.get('s2_programme', '')}\n"
        f"- Scene 3 (Logistics): {cat_rules.get('s3_logistics', '')}\n"
        f"- Scene 4 (Closing): {cat_rules.get('s4_closing', '')}"
    )

    prompt = SPLIT_SCENES.format(
        num_scenes=num_scenes,
        max_scene_index=max(0, num_scenes - 1),
        category_label=cat_rules.get("label", category.title()),
        category_rules_text=cat_rules_text,
        scene_count_rules=_build_scene_count_rules(num_scenes),
        invitation_json=json.dumps(inv, indent=2),
    )

    try:
        result = _parse_json(_llm(prompt))
        raw_scenes = result.get("scenes", [])
    except Exception as exc:
        logger.warning(f"split_scenes parsing failed ({exc}), falling back to default skeleton")
        raw_scenes = []

    scenes = _validate_and_sanitize_scenes(raw_scenes, num_scenes, inv)

    st = load_state(state["invitation_id"])
    st["scenes"] = scenes
    save_state(state["invitation_id"], st)

    return {"scenes": scenes}


# ── Node 2: style_bible ───────────────────────────────────────────────────────

def style_bible(state: dict) -> dict:
    inv = state["input"]
    category = normalize_category(inv.get("invitation_type"))
    cat_rules = get_category_rules(category)
    resolved = resolve_style_hierarchy(category, inv)

    photorealism_instruction = (
        "PHOTOREALISM IS EXPLICITLY REQUESTED: Create photographic-level realism in the invitation stationery."
        if resolved["photorealism"]
        else "STRICTLY NO PHOTOREALISM: The artwork must be an illustrated or designed stationery surface, NOT a photograph of a physical card or real-world room."
    )

    prompt = STYLE_BIBLE.format(
        category=category,
        category_label=cat_rules.get("label", category.title()),
        resolved_art_medium=resolved["art_medium"],
        resolved_rendering_style=resolved["rendering_style"],
        resolved_motifs=", ".join(resolved["decorative_motifs"]),
        resolved_textures=", ".join(resolved["textures"]),
        resolved_typography_space=resolved["typography_space"],
        user_vision=resolved["user_vision"],
        photorealism_instruction=photorealism_instruction,
        photorealism_bool="true" if resolved["photorealism"] else "false",
        invitation_json=json.dumps(inv, indent=2),
    )

    bible = _parse_json(_llm(prompt))
    if not isinstance(bible, dict):
        bible = {}

    # Enforce deterministic photorealism flag and base parameters
    bible["photorealism"] = resolved["photorealism"]
    if not bible.get("art_medium"):
        bible["art_medium"] = resolved["art_medium"]
    if not bible.get("rendering_style"):
        bible["rendering_style"] = resolved["rendering_style"]
    if not bible.get("typography_space"):
        bible["typography_space"] = resolved["typography_space"]

    st = load_state(state["invitation_id"])
    st["style_bible"] = bible
    save_state(state["invitation_id"], st)

    return {"style_bible": bible}


# ── Node 3: build_prompt_scene (parallel worker, called via Send) ─────────────

def _construct_scene_image_prompt(scene: dict[str, Any], inv: dict[str, Any], style_bible_data: dict[str, Any]) -> str:
    """Helper that synthesizes the scene image prompt cleanly for build_prompt_scene and regenerate_image."""
    category = normalize_category(inv.get("invitation_type"))
    cat_rules = get_category_rules(category)

    scene_role = str(scene.get("scene_role") or ("identity" if scene.get("scene_index", 0) == 0 else "programme")).strip().lower()
    scene_purpose = str(scene.get("scene_purpose") or f"Scene {scene.get('scene_index', 0) + 1}")
    visual_direction = str(scene.get("visual_direction") or "Stationery background artwork")
    scene_comp_strategy = get_scene_composition_strategy(scene_role)

    palette_list = style_bible_data.get("colour_palette") or []
    palette_str = ", ".join(
        f"{c.get('name', 'tone')} ({c.get('hex', '#C9A84C')})"
        for c in palette_list if isinstance(c, dict)
    ) if palette_list else "Champagne gold, ivory, soft slate"

    motifs_list = style_bible_data.get("decorative_motifs") or []
    motifs_str = ", ".join(motifs_list) if motifs_list else "delicate border filigree"

    textures_list = style_bible_data.get("textures") or []
    textures_str = ", ".join(textures_list) if textures_list else "heavy textured cardstock"

    typography_space_note = style_bible_data.get("typography_space") or "Clear low-contrast negative space in the central area reserved for typography overlay."

    prompt = BUILD_PROMPT.format(
        scene_index=scene.get("scene_index", 0),
        num_scenes=inv.get("num_scenes", 4),
        scene_role=scene_role.title(),
        category_label=cat_rules.get("label", category.title()),
        style_bible_art_medium=style_bible_data.get("art_medium", "Luxury stationery illustration"),
        style_bible_rendering_style=style_bible_data.get("rendering_style", "Elegant stationery framing"),
        style_bible_palette=palette_str,
        style_bible_motifs=motifs_str,
        style_bible_textures=textures_str,
        style_bible_identity=style_bible_data.get("visual_identity", "Coordinated luxury stationery suite"),
        scene_purpose=scene_purpose,
        scene_composition_strategy=scene_comp_strategy,
        visual_direction=visual_direction,
        typography_space_note=typography_space_note,
    )
    return prompt


def build_prompt_scene(state: dict) -> dict:
    """Builds the image prompt for one scene. Runs in parallel via LangGraph Send."""
    scene = state["_current_scene"]
    inv = state["input"]
    bible = state.get("style_bible") or {}

    prompt = _construct_scene_image_prompt(scene, inv, bible)
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
        {**scene, "image_prompt": prompt_map.get(scene["scene_index"], "")}
        for scene in state["scenes"]
    ]

    st = load_state(state["invitation_id"])
    st["scenes"] = updated
    save_state(state["invitation_id"], st)

    return {"scenes": updated}


# ── Node 4: generate_images ───────────────────────────────────────────────────

def generate_images(state: dict) -> dict:
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
    """
    Runs the vision model to inspect the background image and select layout positioning.
    Text lines are constructed deterministically in Python from validated text_data.
    """
    scene = state["_current_scene"]
    inv = state["input"]
    img_b64 = _file_to_b64(img_path(state["invitation_id"], scene["scene_index"]))

    text_data = scene.get("text_data") or {}
    lines = build_lines_from_text_data(text_data, scene["scene_index"])
    text_summary = "\n".join(f"- [{l['role']}]: {l['text']}" for l in lines) or "Celebration"

    prompt = LAYOUT_TEXT.format(
        text_summary=text_summary,
    )
    raw = _vision(prompt, img_b64)
    try:
        lp = _parse_json(raw)
        if not isinstance(lp, dict):
            lp = {}
    except Exception:
        lp = {}

    text_layer = build_text_layer(scene, inv, lp)

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
    Regenerates a single scene image while preserving the exact resolved Style Bible,
    category defaults, user overrides, and scene_role from the original generation.
    """
    st = load_state(invitation_id)
    inv = st["input"]
    scene = next(s for s in st["scenes"] if s["scene_index"] == scene_index)

    if edited_prompt is None:
        raw = _construct_scene_image_prompt(scene, inv, st.get("style_bible") or {})
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

"""
adapter.py – Converts frontend scene settings into renderer Project/Scene/TextLayer schema.

Follows PhoneFrame.tsx layout, typography ratios, and timing, scaled to 1080x1920.
"""
from __future__ import annotations

import logging
import subprocess
from pathlib import Path
from typing import Any, Optional

from .media import probe, run_ffmpeg
from .schema import Canvas, Project, Scene, TextLayer, Transition, InAnimation

logger = logging.getLogger(__name__)

# Frontend text animation -> Renderer preset
ANIMATION_MAP: dict[str, InAnimation] = {
    "Fade-in": "fade",
    "Slide-up": "slide_up",
    "Typewriter": "wipe",
    "Word-by-word": "fade",
}

# Frontend page transition -> Renderer transition
TRANSITION_MAP: dict[str, Transition] = {
    "Fade": "fade",
    "Slide": "slideleft",
    "Dissolve": "dissolve",
    "Curtain": "wipeleft",
    "Zoom": "fade",
    "Page Flip": "wipeleft",
    "None": "none",
}

# Preview width (~300px) scaling factor to 1080 canvas
SCALE_FACTOR = 3.3


def map_text_animation(frontend_anim: Optional[str]) -> InAnimation:
    if not frontend_anim:
        return "fade"
    return ANIMATION_MAP.get(frontend_anim, "fade")


def map_transition(frontend_trans: Optional[str]) -> Transition:
    if not frontend_trans:
        return "fade"
    return TRANSITION_MAP.get(frontend_trans, "fade")


def ensure_video_clip(
    invitation_id: str,
    scene_idx: int,
    media_dir: Path,
    work_dir: Path,
    duration: float,
) -> Path:
    """
    Returns a valid video clip path for the scene.
    If media/<id>/scene_{idx}.mp4 exists and is valid, uses it.
    If no video clip exists, converts the still image (scene_{idx}.png) to a video of duration seconds.
    Raises RuntimeError if neither video nor still image exists.
    """
    inv_dir = media_dir / invitation_id
    video_path = inv_dir / f"scene_{scene_idx}.mp4"
    if video_path.exists() and video_path.stat().st_size > 0:
        try:
            probe(video_path)
            return video_path
        except Exception as e:
            logger.warning(f"Video clip {video_path} is invalid: {e}; falling back to image")

    # Fallback to still image
    png_path = inv_dir / f"scene_{scene_idx}.png"
    jpg_path = inv_dir / f"scene_{scene_idx}.jpg"
    img_path = png_path if png_path.exists() else (jpg_path if jpg_path.exists() else None)

    if not img_path or not img_path.exists():
        raise RuntimeError(f"Scene {scene_idx + 1} has no video clip or still image in {inv_dir}")

    # Generate looped video clip from still image
    still_dir = work_dir / "stills"
    still_dir.mkdir(parents=True, exist_ok=True)
    out_clip = still_dir / f"scene_{scene_idx}_still.mp4"

    logger.info(f"Generating {duration:.1f}s video clip from still image {img_path}")
    run_ffmpeg([
        "-loop", "1",
        "-i", str(img_path),
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-t", f"{duration:.3f}",
        str(out_clip),
    ])

    return out_clip


def frontend_to_project(
    invitation_id: str,
    frontend_scenes: list[dict[str, Any]],
    media_dir: Path,
    work_dir: Path,
    overall_transition: Optional[str] = None,
) -> Project:
    """
    Convert frontend scenes list into a renderer Project schema.
    """
    scenes: list[Scene] = []

    for idx, sc in enumerate(frontend_scenes):
        scene_idx = sc.get("order", idx + 1) - 1
        scene_id = f"s{idx + 1}"
        duration = float(sc.get("durationSec") or 5.0)

        clip_path = ensure_video_clip(invitation_id, scene_idx, media_dir, work_dir, duration)

        text_layer_cfg = sc.get("textLayer") or {}
        raw_lines = text_layer_cfg.get("lines") or []
        heading_font = text_layer_cfg.get("headingFont") or "Playfair Display"
        body_font = text_layer_cfg.get("bodyFont") or "Cormorant Garamond"
        base_font_size = float(text_layer_cfg.get("fontSize") or 22)
        color = text_layer_cfg.get("color") or "#FFFFFF"
        alignment = text_layer_cfg.get("alignment") or "center"
        if alignment not in ("left", "center", "right"):
            alignment = "center"
        placement = text_layer_cfg.get("placement") or "center"
        x_offset_pct = float(text_layer_cfg.get("xOffset") or 0)
        y_offset_pct = float(text_layer_cfg.get("yOffset") or 0)
        anim_preset = map_text_animation(text_layer_cfg.get("animation"))
        seq_delay_ms = float(text_layer_cfg.get("sequentialDelayMs") or 250)

        # Filter active non-empty lines
        lines_data: list[tuple[str, str, str, bool, int, float]] = []
        for l_idx, line in enumerate(raw_lines):
            text = str(line.get("text") or "").strip()
            if not text:
                continue
            role = str(line.get("role") or "detail").lower()

            if role == "kicker":
                font = body_font
                bold = False
                text = text.upper()
                size = max(18, round(base_font_size * 0.44 * SCALE_FACTOR))
                lh = 1.2
            elif role == "heading":
                font = heading_font
                bold = True
                size = max(24, round(base_font_size * 1.18 * SCALE_FACTOR))
                lh = 1.16
            elif role == "subheading":
                # Condition 2: Use regular file in export (do not add italic files)
                font = body_font
                bold = False
                size = max(20, round(base_font_size * 0.66 * SCALE_FACTOR))
                lh = 1.38
            elif role == "footer":
                font = body_font
                bold = False
                size = max(16, round(base_font_size * 0.48 * SCALE_FACTOR))
                lh = 1.3
            else:  # detail
                font = body_font
                bold = False
                size = max(18, round(base_font_size * 0.56 * SCALE_FACTOR))
                lh = 1.4

            lines_data.append((str(line.get("id") or f"l-{idx}-{l_idx}"), text, font, bold, size, lh))

        # Vertical layout calculation following PhoneFrame.tsx
        gap = 20  # pixels on 1080x1920 (equivalent to gap-1.5 in preview)
        line_heights = [round(size * lh) for _, _, _, _, size, lh in lines_data]
        total_h = sum(line_heights) + max(0, len(lines_data) - 1) * gap
        y_offset_px = (y_offset_pct / 100.0) * 1920.0

        if placement == "top":
            top_y = 140.0 + y_offset_px
        elif placement == "bottom":
            bottom_y = 1920.0 - 140.0 + y_offset_px
            top_y = bottom_y - total_h
        else:  # center
            center_y = 960.0 + y_offset_px
            top_y = center_y - (total_h / 2.0)

        layers: list[TextLayer] = []
        running_y = top_y

        for i, (l_id, text, font, bold, size, _) in enumerate(lines_data):
            lh_px = line_heights[i]
            line_center_y = running_y + (lh_px / 2.0)
            running_y += lh_px + gap

            y_fraction = max(0.05, min(0.95, line_center_y / 1920.0))
            x_fraction = max(0.1, min(0.9, 0.5 + (x_offset_pct / 100.0)))

            start_time = round(0.5 + (i * seq_delay_ms) / 1000.0, 3)
            # Ensure text layer starts before the scene ends
            if start_time >= duration - 0.2:
                start_time = max(0.1, duration - 0.5)

            layers.append(
                TextLayer(
                    id=f"{scene_id}_{l_id}",
                    text=text,
                    font=font,
                    bold=bold,
                    size=size,
                    color=color,
                    align=alignment,
                    x=round(x_fraction, 4),
                    y=round(y_fraction, 4),
                    max_width=0.86,
                    line_spacing=1.2,
                    stroke_width=0,
                    stroke_color="#000000",
                    shadow=True,
                    start=start_time,
                    end=None,
                    anim_in=anim_preset,
                    anim_in_duration=0.6,
                    anim_out="fade",
                    anim_out_duration=0.5,
                )
            )

        scenes.append(Scene(id=scene_id, clip=clip_path, duration=duration, layers=layers))

    # Overall project transition from first scene's transitionAfter or explicitly passed
    first_trans = frontend_scenes[0].get("transitionAfter") if frontend_scenes else None
    transition_choice = overall_transition or first_trans or "Fade"
    trans = map_transition(transition_choice)

    return Project(
        id=f"proj_{invitation_id}",
        canvas=Canvas(width=1080, height=1920, fps=30),
        scenes=scenes,
        transition=trans,
        transition_duration=0.6,
        mute_clip_audio=False,
    )

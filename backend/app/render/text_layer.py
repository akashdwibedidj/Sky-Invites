"""Turns a TextLayer into a tight, transparent PNG plus its position on the canvas.

The PNG is rendered once at full resolution (Pillow + Raqm, so complex scripts
shape correctly). Animation happens later in ffmpeg, which only has to move/fade/
reveal this small image, not redraw text on every frame.
"""
from __future__ import annotations

import hashlib
import json
import math
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageColor, ImageDraw, ImageFilter, ImageFont

from .fonts import resolve_font
from .schema import Canvas, TextLayer


@dataclass(frozen=True)
class RenderedLayer:
    png: Path
    x: int  # top-left on the canvas (can be negative / off-canvas, ffmpeg clips it)
    y: int
    width: int
    height: int


def _font(path: str, px: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    font = ImageFont.truetype(path, px, layout_engine=ImageFont.Layout.RAQM)
    if bold:
        # Variable fonts (one file, many weights) need the weight chosen explicitly.
        try:
            names = [n.decode() if isinstance(n, bytes) else n for n in font.get_variation_names()]
            if "Bold" in names:
                font.set_variation_by_name("Bold")
        except (OSError, AttributeError):
            pass  # static font: the Bold file was already picked by resolve_font
    return font


def _break_long(token: str, font: ImageFont.FreeTypeFont, max_px: float) -> list[str]:
    """Break a single over-wide token (e.g. text with no spaces) by characters."""
    out, cur = [], ""
    for ch in token:
        if cur and font.getlength(cur + ch) > max_px:
            out.append(cur)
            cur = ch
        else:
            cur += ch
    if cur:
        out.append(cur)
    return out


def wrap_text(text: str, font: ImageFont.FreeTypeFont, max_px: float) -> list[str]:
    lines: list[str] = []
    for para in text.split("\n"):
        if not para.strip():
            lines.append("")
            continue
        cur = ""
        for word in para.split(" "):
            trial = word if not cur else f"{cur} {word}"
            if font.getlength(trial) <= max_px:
                cur = trial
                continue
            if cur:
                lines.append(cur)
            if font.getlength(word) > max_px:
                parts = _break_long(word, font, max_px)
                lines.extend(parts[:-1])
                cur = parts[-1]
            else:
                cur = word
        lines.append(cur)
    return lines


def _cache_key(layer: TextLayer, canvas: Canvas, font_path: str) -> str:
    payload = {
        "text": layer.text, "font": font_path, "bold": layer.bold, "size": layer.size,
        "color": layer.color, "align": layer.align, "max_width": layer.max_width,
        "line_spacing": layer.line_spacing, "stroke": [layer.stroke_width, layer.stroke_color],
        "shadow": layer.shadow, "canvas_w": canvas.width, "v": 1,
    }
    return hashlib.sha1(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:12]


def render_layer(layer: TextLayer, canvas: Canvas, out_dir: Path) -> RenderedLayer:
    out_dir.mkdir(parents=True, exist_ok=True)
    font_path = resolve_font(layer.font, layer.bold)
    png = out_dir / f"{layer.id}-{_cache_key(layer, canvas, font_path)}.png"

    if png.exists():
        with Image.open(png) as im:
            w, h = im.size
    else:
        w, h = _draw(layer, canvas, font_path, png)

    cx, cy = layer.x * canvas.width, layer.y * canvas.height
    return RenderedLayer(png, round(cx - w / 2), round(cy - h / 2), w, h)


def _draw(layer: TextLayer, canvas: Canvas, font_path: str, png: Path) -> tuple[int, int]:
    px = max(6, round(layer.size * canvas.width / 1080))
    font = _font(font_path, px, layer.bold)
    stroke = round(layer.stroke_width * canvas.width / 1080)

    lines = wrap_text(layer.text, font, layer.max_width * canvas.width)
    widths = [font.getlength(l) for l in lines]
    line_h = round(px * layer.line_spacing)
    ascent, descent = font.getmetrics()
    block_w = math.ceil(max(widths + [1]))
    block_h = line_h * (len(lines) - 1) + ascent + descent

    blur = max(2, px // 18)
    pad = int(px * 0.25) + stroke * 2 + blur * 2  # room for swashes, stroke and shadow
    size = (block_w + 2 * pad, block_h + 2 * pad)

    fill = ImageColor.getcolor(layer.color, "RGBA")
    stroke_fill = ImageColor.getcolor(layer.stroke_color, "RGBA")

    def x_for(width: float) -> float:
        if layer.align == "left":
            return pad
        if layer.align == "right":
            return pad + block_w - width
        return pad + (block_w - width) / 2

    text_img = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(text_img)
    for i, line in enumerate(lines):
        d.text((x_for(widths[i]), pad + i * line_h), line, font=font, fill=fill,
               stroke_width=stroke, stroke_fill=stroke_fill, anchor="la")

    result = text_img
    if layer.shadow:
        mask = Image.new("L", size, 0)
        md = ImageDraw.Draw(mask)
        for i, line in enumerate(lines):
            md.text((x_for(widths[i]), pad + i * line_h), line, font=font, fill=255,
                    stroke_width=stroke, anchor="la")
        mask = mask.filter(ImageFilter.GaussianBlur(blur)).point(lambda v: int(v * 0.6))
        shadow = Image.new("RGBA", size, (0, 0, 0, 255))
        shadow.putalpha(mask)
        shifted = Image.new("RGBA", size, (0, 0, 0, 0))
        shifted.paste(shadow, (0, max(1, round(px * 0.04))))
        result = Image.alpha_composite(shifted, text_img)

    result.save(png)
    return size

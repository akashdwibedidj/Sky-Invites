"""Font lookup.

Drop .ttf/.otf files into backend/assets/fonts/ (e.g. Playfair Display, Great Vibes,
Noto Sans Devanagari, Noto Sans Oriya) and refer to them by family name. If a family
is not in that folder, we ask the system (fontconfig) for it.

Text in Indian languages needs a font that contains those glyphs; shaping itself
is handled by Pillow's Raqm engine.
"""
from __future__ import annotations

import logging
import re
import subprocess
from functools import lru_cache
from pathlib import Path

log = logging.getLogger(__name__)

ASSET_FONT_DIR = Path(__file__).resolve().parents[2] / "assets" / "fonts"
_FALLBACK = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
_STYLE_WORDS = ("bold", "italic", "oblique", "light", "thin", "black", "medium", "semibold", "extrabold", "extralight")


def _norm(s: str) -> str:
    return re.sub(r"[\s\-_]+", "", s).lower()


def _from_assets(family: str, bold: bool) -> str | None:
    if not ASSET_FONT_DIR.exists():
        return None
    fam = _norm(family)
    best: tuple[int, str] | None = None
    for f in ASSET_FONT_DIR.rglob("*"):
        if f.suffix.lower() not in {".ttf", ".otf"}:
            continue
        stem = _norm(f.stem)
        if not stem.startswith(fam):
            continue
        rest = stem[len(fam):]
        is_bold = "bold" in rest and "semibold" not in rest and "extrabold" not in rest
        other_style = any(w in rest for w in _STYLE_WORDS if w != "bold")
        score = 0
        if is_bold == bold:
            score += 10
        if not other_style:
            score += 5
        if rest in ("", "regular") or (bold and rest == "bold"):
            score += 3
        if best is None or score > best[0]:
            best = (score, str(f))
    return best[1] if best else None


def _from_system(family: str, bold: bool) -> str | None:
    pattern = f"{family}:bold" if bold else family
    try:
        out = subprocess.run(
            ["fc-match", "-f", "%{family}|%{file}", pattern],
            capture_output=True, text=True, timeout=10,
        ).stdout
    except (OSError, subprocess.SubprocessError):
        return None
    if "|" not in out:
        return None
    fam, path = out.split("|", 1)
    # fc-match always returns *something*; only accept it if the family really matches.
    if _norm(family) in {_norm(x) for x in fam.split(",")} and Path(path).exists():
        return path
    return None


@lru_cache(maxsize=256)
def resolve_font(family: str, bold: bool = False) -> str:
    path = _from_assets(family, bold) or _from_system(family, bold)
    if path:
        return path
    log.warning("Font %r (bold=%s) not found; falling back to DejaVu Sans", family, bold)
    return _FALLBACK

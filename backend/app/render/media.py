"""Thin wrappers around ffprobe / ffmpeg."""
from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from pathlib import Path


class RenderError(RuntimeError):
    pass


@dataclass(frozen=True)
class MediaInfo:
    duration: float
    width: int
    height: int
    has_audio: bool


def probe(path: Path) -> MediaInfo:
    if not Path(path).exists():
        raise RenderError(f"Media file not found: {path}")
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(path)],
        capture_output=True, text=True,
    )
    if r.returncode != 0:
        raise RenderError(f"ffprobe failed for {path}: {r.stderr[-500:]}")
    data = json.loads(r.stdout)
    video = next((s for s in data["streams"] if s["codec_type"] == "video"), None)
    if video is None:
        raise RenderError(f"No video stream in {path}")
    has_audio = any(s["codec_type"] == "audio" for s in data["streams"])
    duration = float(data["format"].get("duration") or video.get("duration") or 0)
    return MediaInfo(duration, int(video["width"]), int(video["height"]), has_audio)


def run_ffmpeg(args: list[str]) -> None:
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RenderError(f"ffmpeg failed:\n{r.stderr[-2000:]}")

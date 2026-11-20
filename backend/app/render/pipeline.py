"""Public entry point: render a whole Project to one mp4.

Each scene is rendered (and cached) on its own, so editing one text only
re-renders that scene; stitching the scenes together is the only step that always runs.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from .scene_renderer import render_scene
from .schema import Canvas, Project
from .stitcher import stitch

ProgressFn = Callable[[str, int, int], None]


@dataclass(frozen=True)
class RenderResult:
    output: Path
    duration: float
    scenes_rendered: int
    scenes_cached: int


def _scaled(canvas: Canvas, scale: float) -> Canvas:
    even = lambda v: max(2, round(v * scale) // 2 * 2)
    return canvas.model_copy(update={"width": even(canvas.width), "height": even(canvas.height)})


def render_project(project: Project, work_dir: Path, output: Path,
                   progress: ProgressFn | None = None, scale: float = 1.0) -> RenderResult:
    """Render the project. Use scale<1 (e.g. 0.5) for a fast, smaller review preview;
    text sizes scale with the canvas so the preview looks the same as the export."""
    work_dir = Path(work_dir)
    if scale != 1.0:
        project = project.model_copy(update={"canvas": _scaled(project.canvas, scale)})
    n = len(project.scenes)
    files: list[Path] = []
    rendered = cached = 0

    for i, scene in enumerate(project.scenes):
        if progress:
            progress("scene", i, n)
        res = render_scene(scene, project.canvas, work_dir, project.mute_clip_audio)
        files.append(res.path)
        cached += res.cached
        rendered += not res.cached

    if progress:
        progress("stitch", n, n)
    duration = stitch(files, project.canvas, project.transition, project.transition_duration, output)
    if progress:
        progress("done", n, n)
    return RenderResult(Path(output), duration, rendered, cached)

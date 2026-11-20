"""Render one scene: clean clip + animated text layers -> one mp4.

Text animation is done by ffmpeg filters on the pre-rendered layer PNGs:
  fade        alpha fade in
  slide_up    fade + glide up into place   (slide_down: glide down)
  wipe        soft left-to-right reveal
and an optional fade out at the end of the layer's time window.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path

from .fonts import resolve_font
from .media import RenderError, probe, run_ffmpeg
from .schema import Canvas, Scene, TextLayer
from .text_layer import RenderedLayer, render_layer

RENDER_VERSION = "1"
SLIDE_DISTANCE = 0.04  # fraction of canvas height


@dataclass(frozen=True)
class SceneResult:
    path: Path
    cached: bool


def _clip_fingerprint(path: Path) -> list:
    st = Path(path).stat()
    return [str(path), st.st_size, st.st_mtime_ns]


def scene_cache_key(scene: Scene, canvas: Canvas, mute: bool) -> str:
    payload = {
        "scene": scene.model_dump(mode="json"),
        "clip": _clip_fingerprint(scene.clip),
        "canvas": canvas.model_dump(),
        "mute": mute,
        "fonts": [resolve_font(l.font, l.bold) for l in scene.layers],
        "v": RENDER_VERSION,
    }
    return hashlib.sha1(json.dumps(payload, sort_keys=True).encode()).hexdigest()[:12]


def _p(start: float, dur: float, var: str) -> str:
    """Progress 0..1 of an animation, as an ffmpeg expression."""
    return f"min(1,max(0,({var}-{start:.3f})/{dur:.3f}))"


def _layer_filters(layer: TextLayer, scene_dur: float, rl: RenderedLayer, canvas: Canvas):
    """Return (filter chain for the layer stream, overlay x expr, overlay y expr, enable expr)."""
    s = layer.start
    e = min(layer.end if layer.end is not None else scene_dur, scene_dur)
    if s >= e:
        raise RenderError(f"Text layer {layer.id!r} starts after the scene ends ({s}s >= {e}s)")
    ind = min(layer.anim_in_duration, e - s)

    chain = ["format=rgba"]
    x_expr, y_expr = str(rl.x), str(rl.y)

    if layer.anim_in in ("fade", "slide_up", "slide_down"):
        chain.append(f"fade=t=in:st={s:.3f}:d={ind:.3f}:alpha=1")
    if layer.anim_in in ("slide_up", "slide_down"):
        off = round(SLIDE_DISTANCE * canvas.height) * (1 if layer.anim_in == "slide_up" else -1)
        # ease-out cubic: moves fast at first, settles gently
        y_expr = f"{rl.y}+({off})*pow(1-{_p(s, ind, 't')},3)"
    if layer.anim_in == "wipe":
        edge = "(W*0.15)"
        pos = f"({_p(s, ind, 'T')}*(W+{edge}))"
        chain.append(
            "format=gbrap,"
            f"geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='alpha(X,Y)*clip(({pos}-X)/{edge},0,1)',"
            "format=rgba"
        )
    if layer.anim_out == "fade":
        od = min(layer.anim_out_duration, e - s)
        chain.append(f"fade=t=out:st={e - od:.3f}:d={od:.3f}:alpha=1")

    enable = f"between(t,{s:.3f},{e:.3f})"
    return ",".join(chain), x_expr, y_expr, enable


def render_scene(scene: Scene, canvas: Canvas, work_dir: Path, mute_audio: bool = False) -> SceneResult:
    work_dir = Path(work_dir)
    scenes_dir = work_dir / "scenes"
    scenes_dir.mkdir(parents=True, exist_ok=True)
    out = scenes_dir / f"{scene.id}-{scene_cache_key(scene, canvas, mute_audio)}.mp4"
    if out.exists():
        return SceneResult(out, cached=True)

    info = probe(scene.clip)
    dur = scene.duration or info.duration
    W, H, fps = canvas.width, canvas.height, canvas.fps

    rendered = [render_layer(l, canvas, work_dir / "layers") for l in scene.layers]

    args: list[str] = ["-i", str(scene.clip)]
    for rl in rendered:
        args += ["-framerate", str(fps), "-loop", "1", "-t", f"{dur:.3f}", "-i", str(rl.png)]
    use_clip_audio = info.has_audio and not mute_audio
    if not use_clip_audio:
        args += ["-f", "lavfi", "-t", f"{dur:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
    audio_idx = len(rendered) + 1

    fc: list[str] = []
    base = (
        f"[0:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
        f"setsar=1,fps={fps},format=yuv420p"
    )
    if dur > info.duration:  # hold the last frame if the user asked for a longer scene
        base += f",tpad=stop_mode=clone:stop_duration={dur - info.duration + 0.1:.3f}"
    fc.append(f"{base},trim=duration={dur:.3f},setpts=PTS-STARTPTS[v0]")

    last = "v0"
    for i, (layer, rl) in enumerate(zip(scene.layers, rendered), start=1):
        chain, x_expr, y_expr, enable = _layer_filters(layer, dur, rl, canvas)
        fc.append(f"[{i}:v]{chain}[L{i}]")
        fc.append(
            f"[{last}][L{i}]overlay=x='{x_expr}':y='{y_expr}':enable='{enable}':"
            f"eof_action=pass:format=auto[v{i}]"
        )
        last = f"v{i}"

    if use_clip_audio:
        fc.append(
            "[0:a]aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo,"
            f"apad=whole_dur={dur:.3f},atrim=duration={dur:.3f},asetpts=PTS-STARTPTS[a]"
        )
    else:
        fc.append(f"[{audio_idx}:a]atrim=duration={dur:.3f},asetpts=PTS-STARTPTS[a]")

    tmp = out.with_suffix(".part.mp4")
    run_ffmpeg([
        *args, "-filter_complex", ";".join(fc),
        "-map", f"[{last}]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", "-r", str(fps),
        "-c:a", "aac", "-b:a", "192k", "-t", f"{dur:.3f}", "-movflags", "+faststart", str(tmp),
    ])
    tmp.replace(out)
    return SceneResult(out, cached=False)

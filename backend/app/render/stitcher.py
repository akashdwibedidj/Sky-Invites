"""Join rendered scene files into one video with crossfade transitions."""
from __future__ import annotations

import shutil
from pathlib import Path

from .media import probe, run_ffmpeg
from .schema import Canvas, Transition

EXPORT_PRESET = "veryfast"  # x264 speed/size trade-off for the final encode
EXPORT_CRF = "18"


def stitch(scene_files: list[Path], canvas: Canvas, transition: Transition,
           transition_duration: float, output: Path) -> float:
    """Returns the final duration in seconds."""
    output = Path(output)
    output.parent.mkdir(parents=True, exist_ok=True)
    durs = [probe(f).duration for f in scene_files]
    n = len(scene_files)

    if n == 1:
        shutil.copyfile(scene_files[0], output)
        return durs[0]

    args: list[str] = []
    for f in scene_files:
        args += ["-i", str(f)]

    if transition == "none" or transition_duration <= 0:
        inputs = "".join(f"[{i}:v][{i}:a]" for i in range(n))
        fc = f"{inputs}concat=n={n}:v=1:a=1[v][a]"
        total = sum(durs)
    else:
        # A transition can't be longer than half of the shortest scene.
        t = min(transition_duration, min(durs) / 2 - 0.05)
        parts: list[str] = []
        v_prev, a_prev = "0:v", "0:a"
        for k in range(1, n):
            offset = sum(durs[:k]) - k * t
            v_out, a_out = f"vx{k}", f"ax{k}"
            parts.append(
                f"[{v_prev}][{k}:v]xfade=transition={transition}:duration={t:.3f}:offset={offset:.3f}[{v_out}]"
            )
            parts.append(f"[{a_prev}][{k}:a]acrossfade=d={t:.3f}:c1=tri:c2=tri[{a_out}]")
            v_prev, a_prev = v_out, a_out
        fc = ";".join(parts) + f";[{v_prev}]null[v];[{a_prev}]anull[a]"
        total = sum(durs) - (n - 1) * t

    tmp = output.with_suffix(".part.mp4")
    run_ffmpeg([
        *args, "-filter_complex", fc, "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", EXPORT_PRESET, "-crf", EXPORT_CRF, "-pix_fmt", "yuv420p", "-r", str(canvas.fps),
        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(tmp),
    ])
    tmp.replace(output)
    return total

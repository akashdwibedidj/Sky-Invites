import subprocess
from pathlib import Path

import numpy as np
import pytest
from PIL import Image, ImageChops

import sys
from pathlib import Path
if str(Path(__file__).resolve().parent) not in sys.path:
    sys.path.insert(0, str(Path(__file__).resolve().parent))
from make_test_clip import make_clip
from app.render import Canvas, Project, Scene, TextLayer, render_project
from app.render.media import probe
from app.render.text_layer import render_layer, wrap_text
from app.render.schema import TextLayer as TL

SMALL = Canvas(width=270, height=480, fps=24)  # small canvas keeps tests fast


@pytest.fixture(scope="module")
def clips(tmp_path_factory):
    d = tmp_path_factory.mktemp("clips")
    make_clip(d / "a.mp4", 3, "0x1e3a5f", "0xd9a066")
    make_clip(d / "b.mp4", 3, "0x5f1e4a", "0xf2c9a0", audio=False)  # silent clip must work too
    return d


def frame(video: Path, t: float, out: Path) -> Image.Image:
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", str(t),
                    "-i", str(video), "-frames:v", "1", str(out)], check=True)
    return Image.open(out).convert("RGB")


def diff_pixels(a: Image.Image, b: Image.Image, threshold=40) -> int:
    d = ImageChops.difference(a, b).convert("L").point(lambda v: 255 if v > threshold else 0)
    return d.histogram()[255]


def project(clips, layers_a=(), layers_b=(), **kw):
    return Project(id="t", canvas=SMALL, scenes=[
        Scene(id="a", clip=clips / "a.mp4", layers=list(layers_a)),
        Scene(id="b", clip=clips / "b.mp4", layers=list(layers_b)),
    ], **kw)


def test_text_layer_png_has_content(tmp_path):
    rl = render_layer(TL(id="n", text="Hello world", size=90), Canvas(), tmp_path)
    im = Image.open(rl.png)
    assert im.mode == "RGBA" and im.getbbox() is not None
    assert (rl.width, rl.height) == im.size


def test_wrap_respects_width_and_breaks_long_words():
    from app.render.text_layer import _font
    from app.render.fonts import resolve_font
    font = _font(resolve_font("Lora"), 40)
    lines = wrap_text("a b c d e f g h i j k l m n o p q r s t u v w x y z " * 3, font, 300)
    assert len(lines) > 3 and all(font.getlength(l) <= 300 for l in lines)
    assert all(font.getlength(l) <= 300 for l in wrap_text("W" * 80, font, 300))


def test_output_size_duration_and_audio(clips, tmp_path):
    out = tmp_path / "o.mp4"
    res = render_project(project(clips), tmp_path / "w", out)
    info = probe(out)
    assert (info.width, info.height) == (270, 480)
    assert info.has_audio  # silent source clip gets a silent track, so stitching works
    # two 3s scenes, 0.6s crossfade
    assert res.duration == pytest.approx(5.4, abs=0.1)
    assert info.duration == pytest.approx(5.4, abs=0.2)


def test_text_appears_at_start_time_and_not_before(clips, tmp_path):
    layer = TextLayer(id="t", text="Hello", size=100, start=1.0, anim_in="fade", anim_in_duration=0.3,
                      anim_out="none", color="#FFFFFF")
    with_text = tmp_path / "with.mp4"
    without = tmp_path / "without.mp4"
    render_project(project(clips, [layer]), tmp_path / "w1", with_text)
    render_project(project(clips), tmp_path / "w2", without)
    before = diff_pixels(frame(with_text, 0.4, tmp_path / "1.png"), frame(without, 0.4, tmp_path / "2.png"))
    after = diff_pixels(frame(with_text, 2.0, tmp_path / "3.png"), frame(without, 2.0, tmp_path / "4.png"))
    assert before < 20
    assert after > 200


def test_text_disappears_after_end(clips, tmp_path):
    layer = TextLayer(id="t", text="Hello", size=100, start=0.3, end=1.2, anim_out="fade",
                      anim_out_duration=0.3)
    a, b = tmp_path / "a.mp4", tmp_path / "b.mp4"
    render_project(project(clips, [layer]), tmp_path / "w1", a)
    render_project(project(clips), tmp_path / "w2", b)
    assert diff_pixels(frame(a, 0.9, tmp_path / "1.png"), frame(b, 0.9, tmp_path / "2.png")) > 200
    assert diff_pixels(frame(a, 1.8, tmp_path / "3.png"), frame(b, 1.8, tmp_path / "4.png")) < 20


def test_wipe_reveals_progressively(clips, tmp_path):
    layer = TextLayer(id="t", text="Hello world", size=60, start=0.2, anim_in="wipe",
                      anim_in_duration=1.6, anim_out="none")
    out, base = tmp_path / "o.mp4", tmp_path / "b.mp4"
    render_project(project(clips, [layer]), tmp_path / "w1", out)
    render_project(project(clips), tmp_path / "w2", base)
    early = diff_pixels(frame(out, 0.6, tmp_path / "1.png"), frame(base, 0.6, tmp_path / "2.png"))
    mid = diff_pixels(frame(out, 1.0, tmp_path / "3.png"), frame(base, 1.0, tmp_path / "4.png"))
    done = diff_pixels(frame(out, 2.2, tmp_path / "5.png"), frame(base, 2.2, tmp_path / "6.png"))
    assert early < mid < done


def test_slide_moves_text(clips, tmp_path):
    layer = TextLayer(id="t", text="Hello", size=100, start=0.2, anim_in="slide_up",
                      anim_in_duration=1.5, anim_out="none")
    out = tmp_path / "o.mp4"
    render_project(project(clips, [layer]), tmp_path / "w", out)
    base = tmp_path / "b.mp4"
    render_project(project(clips), tmp_path / "wb", base)

    def text_centre_y(t):
        a = frame(out, t, tmp_path / f"s{t}.png")
        b = frame(base, t, tmp_path / f"sb{t}.png")
        diff = np.asarray(ImageChops.difference(a, b).convert("L")) > 15
        assert diff.sum() > 100, "text not visible"
        return np.nonzero(diff)[0].mean()  # average row of the changed pixels

    # text glides up into place: lower on screen early, settled higher later
    assert text_centre_y(0.9) > text_centre_y(2.5)


def test_edit_only_rerenders_changed_scene(clips, tmp_path):
    la = TextLayer(id="d", text="14 Feb 2027")
    lb = TextLayer(id="v", text="Venue")
    work = tmp_path / "w"
    r1 = render_project(project(clips, [la], [lb]), work, tmp_path / "1.mp4")
    assert (r1.scenes_rendered, r1.scenes_cached) == (2, 0)
    r2 = render_project(project(clips, [la], [lb]), work, tmp_path / "2.mp4")
    assert (r2.scenes_rendered, r2.scenes_cached) == (0, 2)
    # change the date text only -> scene "a" re-renders, scene "b" comes from cache
    r3 = render_project(project(clips, [la.model_copy(update={"text": "15 Feb 2027"})], [lb]),
                        work, tmp_path / "3.mp4")
    assert (r3.scenes_rendered, r3.scenes_cached) == (1, 1)


def test_preview_scale_is_smaller(clips, tmp_path):
    out = tmp_path / "p.mp4"
    render_project(project(clips, [TextLayer(id="t", text="Hi")]), tmp_path / "w", out, scale=0.5)
    info = probe(out)
    assert (info.width, info.height) == (134, 240)


def test_scene_duration_trim_and_extend(clips, tmp_path):
    p = Project(id="t", canvas=SMALL, transition="none", scenes=[
        Scene(id="a", clip=clips / "a.mp4", duration=1.5),   # trim
        Scene(id="b", clip=clips / "b.mp4", duration=4.0),   # extend (holds last frame)
    ])
    res = render_project(p, tmp_path / "w", tmp_path / "o.mp4")
    assert res.duration == pytest.approx(5.5, abs=0.15)


def test_validation_errors():
    with pytest.raises(ValueError):
        TextLayer(id="x", text="a", start=2, end=1)
    with pytest.raises(ValueError):
        Project(id="p", scenes=[Scene(id="a", clip="x.mp4"), Scene(id="a", clip="y.mp4")])

"""Render a 2-scene demo invitation at 1080x1920 using synthetic clips."""
import sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from make_test_clip import make_clip
from app.render import Project, Scene, TextLayer, render_project

work = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/sky_demo")
work.mkdir(parents=True, exist_ok=True)
make_clip(work / "scene1.mp4", 12, "0x1e3a5f", "0xd9a066")
make_clip(work / "scene2.mp4", 12, "0x5f1e4a", "0xf2c9a0")

project = Project(
    id="demo",
    scenes=[
        Scene(id="s1", clip=work / "scene1.mp4", layers=[
            TextLayer(id="intro", text="Together with their families", size=54, y=0.30,
                      start=0.5, anim_in="fade"),
            TextLayer(id="names", text="Aarav & Meera", font="Lora", bold=True, size=110, y=0.42,
                      start=1.5, anim_in="slide_up"),
            TextLayer(id="tag", text="invite you to celebrate their wedding", size=50, y=0.55,
                      start=3.0, anim_in="wipe", anim_in_duration=1.5),
        ]),
        Scene(id="s2", clip=work / "scene2.mp4", layers=[
            TextLayer(id="date", text="14 February 2027", font="Lora", bold=True, size=88, y=0.45,
                      start=0.8, anim_in="slide_down"),
            TextLayer(id="venue", text="The Grand Palace Gardens\nBhubaneswar", size=56, y=0.58,
                      start=2.0, anim_in="fade"),
        ]),
    ],
)

t = time.time()
res = render_project(project, work / "work", work / "invitation.mp4",
                     progress=lambda stage, i, n: print(f"  {stage} {i}/{n}"))
print(f"rendered={res.scenes_rendered} cached={res.scenes_cached} "
      f"duration={res.duration:.1f}s in {time.time()-t:.1f}s -> {res.output}")

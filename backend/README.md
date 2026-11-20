# Sky Invites - backend

## Stage 2: renderer (done)

`app/render/` turns a `Project` (scenes + clean video clips + text layers) into one mp4.
Text is never baked into images or video, so any text can be edited and re-exported
without regenerating anything.

    from app.render import Project, Scene, TextLayer, render_project
    render_project(project, work_dir, "invitation.mp4")            # full 1080x1920 export
    render_project(project, work_dir, "preview.mp4", scale=0.5)    # fast review preview

- Per-scene cache: editing one text re-renders only that scene.
- Text animations: none, fade, slide_up, slide_down, wipe (+ optional fade out).
- Transitions between scenes: none, fade, fadeblack, dissolve, wipeleft, slideleft, slideup.
- Clips are scaled to cover the 9:16 canvas; text is drawn at full resolution on top.
- Fonts: put .ttf/.otf files in `assets/fonts/` and use the family name. Text in Indian
  languages needs a font that has those glyphs (e.g. Noto Sans Devanagari / Oriya).

## Run

    pip install -r requirements.txt     # also needs ffmpeg + ffprobe on PATH
    python -m pytest tests -q
    python scripts/demo_render.py /tmp/sky_demo

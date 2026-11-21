"""
run_graph2.py
Run Graph 2: image → video prompt → video clip (per scene, in parallel).

Usage:
    python run_graph2.py <invitation_id>

Two-phase run with a user-review pause between them:
  Phase 1 — analyze_image: inspects each scene image with the vision model and
             writes a Grok video prompt. Saves video_prompt to state.json and prints it.
  [PAUSE]  — Edit media/<id>/state.json → scenes[*].video_prompt if you want to tweak.
             You can also add an "animation_note" field to any scene before this run.
  Phase 2 — generate_video: sends each image + video_prompt to Grok, saves the MP4.
"""

import json
import sys
from pathlib import Path

# ── Load .env if python-dotenv is installed ───────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent / ".env", override=True)
except ImportError:
    pass  # Set OPENAI_API_KEY and XAI_API_KEY manually in your environment

# ── Make backend/ importable ──────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parent))

from storage import load_state                              # noqa: E402
from graph2.graph import build_analyze_graph, build_generate_graph, Graph2State  # noqa: E402


# ── Helpers ───────────────────────────────────────────────────────────────────

DIVIDER = "─" * 64

def _banner(label: str) -> None:
    print(f"\n{DIVIDER}\n  {label}\n{DIVIDER}")

def _section(label: str) -> None:
    print(f"\n{'·' * 64}\n  {label}\n{'·' * 64}")

def _make_initial_state(invitation_id: str) -> Graph2State:
    """Read state.json and build a fresh Graph2State from it."""
    st = load_state(invitation_id)
    return Graph2State(
        invitation_id=invitation_id,
        input=st["input"],
        style_bible=st["style_bible"],
        scenes=st["scenes"],
        _current_scene=None,
        _video_prompt_results=[],
        _video_path_results=[],
    )


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python run_graph2.py <invitation_id>")
        print("  invitation_id is printed at the end of run_graph1.py")
        sys.exit(1)

    invitation_id = sys.argv[1]

    _banner("Sky Invites — Graph 2")
    print(f"  Invitation ID : {invitation_id}")

    # ── Phase 1: analyze images → generate video prompts ─────────────────────
    _banner("PHASE 1 — Analyzing scene images")
    print("  Calling vision model for each scene in parallel…\n")

    analyze_graph = build_analyze_graph()
    analyze_graph.invoke(_make_initial_state(invitation_id))

    # Print the generated video prompts (re-read from state.json)
    state = load_state(invitation_id)
    for scene in sorted(state["scenes"], key=lambda s: s["scene_index"]):
        idx = scene["scene_index"]
        _section(f"SCENE {idx}  —  {scene['scene_purpose']}")
        print(f"\n  VIDEO PROMPT\n  {'─'*56}")
        print(f"  {scene.get('video_prompt', 'N/A')}\n")

    # ── User review pause ─────────────────────────────────────────────────────
    print(f"\n{DIVIDER}")
    print(f"  REVIEW PAUSE")
    print(f"{DIVIDER}")
    print(f"\n  Open  media/{invitation_id}/state.json  if you want to edit any")
    print(f"  video_prompt field before Grok generates the video clips.")
    print(f"\n  Tip: you can also add  \"animation_note\": \"your hint\"  to any")
    print(f"  scene before running this script to guide the vision model.")
    print()
    input("  Press Enter when ready to generate videos…\n")

    # ── Phase 2: generate video clips ─────────────────────────────────────────
    _banner("PHASE 2 — Generating video clips with Grok")
    print("  Sending images + prompts to Grok in parallel… (this may take a while)\n")

    # Re-read state.json — the user may have edited video_prompt fields
    generate_graph = build_generate_graph()
    generate_graph.invoke(_make_initial_state(invitation_id))

    # Print results
    state = load_state(invitation_id)
    for scene in sorted(state["scenes"], key=lambda s: s["scene_index"]):
        idx = scene["scene_index"]
        _section(f"SCENE {idx}  —  {scene['scene_purpose']}")
        print(f"\n  VIDEO PROMPT  : {scene.get('video_prompt', 'N/A')}")
        print(f"  CLIP PATH     : {scene.get('video_path', 'N/A')}\n")

    # ── Summary ───────────────────────────────────────────────────────────────
    _banner("DONE")
    print(f"  state.json  →  media/{invitation_id}/state.json")
    print(f"  Images      →  media/{invitation_id}/scene_*.png")
    print(f"  Videos      →  media/{invitation_id}/scene_*.mp4")
    print()


if __name__ == "__main__":
    main()

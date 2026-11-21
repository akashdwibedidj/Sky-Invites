"""
run_graph1.py
Run Graph 1 end-to-end: input → scenes → style bible → prompts → images → text layout.

Usage:
    python run_graph1.py                        # uses sample_input.json
    python run_graph1.py path/to/input.json

Prints the style bible, every scene's image prompt, image path, and text blocks.
Saves everything to media/<invitation_id>/state.json.
"""

import json
import os
import sys
import uuid
from pathlib import Path
from dotenv import load_dotenv

# Load .env before importing graph modules
ENV_PATH = Path(__file__).resolve().parent / ".env"
load_dotenv(ENV_PATH, override=True)

# ── Make backend/ importable ──────────────────────────────────────────────────
sys.path.insert(0, str(Path(__file__).resolve().parent))

from storage import create_invitation, load_state   # noqa: E402
from graph1.graph import build_graph, Graph1State   # noqa: E402


# ── Helpers ───────────────────────────────────────────────────────────────────

DIVIDER = "─" * 64

def _banner(label: str) -> None:
    print(f"\n{DIVIDER}\n  {label}\n{DIVIDER}")

def _section(label: str) -> None:
    print(f"\n{'·' * 64}")
    print(f"  {label}")
    print('·' * 64)


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    input_path = sys.argv[1] if len(sys.argv) > 1 else "sample_input.json"
    with open(input_path, "r", encoding="utf-8") as f:
        invitation_input = json.load(f)

    invitation_id = str(uuid.uuid4())[:8]

    _banner(f"Sky Invites — Graph 1")
    print(f"  Invitation ID : {invitation_id}")
    print(f"  Input file    : {input_path}")
    print(f"  Scenes        : {invitation_input['num_scenes']}")
    print(f"  Story mode    : {invitation_input.get('story_mode', False)}")

    # Create storage folder + initial state.json
    create_invitation(invitation_id, invitation_input)

    # Build and run the graph
    print(f"\nRunning graph…  (this takes a minute or two)\n")
    graph = build_graph()
    graph.invoke(Graph1State(
        invitation_id=invitation_id,
        input=invitation_input,
        style_bible=None,
        scenes=[],
        _current_scene=None,
        _prompt_results=[],
        _layout_results=[],
    ))

    # Read the saved state.json as the authoritative output
    state = load_state(invitation_id)

    # ── Style Bible ───────────────────────────────────────────────────────────
    _banner("STYLE BIBLE")
    print(json.dumps(state["style_bible"], indent=2))

    # ── Per-scene results ─────────────────────────────────────────────────────
    for scene in sorted(state["scenes"], key=lambda s: s["scene_index"]):
        idx = scene["scene_index"]
        _section(f"SCENE {idx}  —  {scene['scene_purpose']}")

        print(f"\n  IMAGE PROMPT\n  {'─'*56}")
        print(f"  {scene.get('image_prompt', 'N/A')}\n")

        print(f"  IMAGE PATH : {scene.get('image_path', 'N/A')}\n")

        blocks = scene.get("text_blocks", [])
        print(f"  TEXT BLOCKS ({len(blocks)} block{'s' if len(blocks) != 1 else ''})")
        print(f"  {'─'*56}")
        for i, block in enumerate(blocks):
            print(
                f"  [{i}] text={block['text']!r}  font={block['font']}  "
                f"size={block['size']}%  colour={block['colour']}  "
                f"align={block['alignment']}  "
                f"x={block['x']}%  y={block['y']}%  width={block['width']}%"
            )

    # ── Summary ───────────────────────────────────────────────────────────────
    _banner("DONE")
    print(f"  state.json  →  media/{invitation_id}/state.json")
    print(f"  Images      →  media/{invitation_id}/scene_*.png")
    print()
    print(f"  Invitation ID: {invitation_id}")
    print(f"  Pass this ID to run_graph2.py after reviewing state.json.")
    print()


if __name__ == "__main__":
    main()

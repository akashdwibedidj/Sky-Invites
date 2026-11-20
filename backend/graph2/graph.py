"""
graph2/graph.py
Two small graphs for Graph 2.

  analyze_graph  : runs analyze_image for every scene in parallel, saves video_prompts.
  generate_graph : runs generate_video_scene for every scene in parallel, saves clip paths.

They are run separately in run_graph2.py with a user-review pause between them so the
user can hand-edit video_prompt fields in state.json before video generation starts.
"""

import operator
from typing import Annotated, TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import Send


# ── Shared state ──────────────────────────────────────────────────────────────

class Graph2State(TypedDict):
    invitation_id: str
    input: dict          # original invitation input (for invitation_type, etc.)
    style_bible: dict
    scenes: list
    _current_scene: dict | None                           # scratch field set per Send
    _video_prompt_results: Annotated[list, operator.add]  # collects from analyze_image
    _video_path_results:   Annotated[list, operator.add]  # collects from generate_video_scene


# ── Fan-out routers ───────────────────────────────────────────────────────────

def _route_analyze(state: Graph2State) -> list[Send]:
    return [
        Send("analyze_image", {**state, "_current_scene": scene})
        for scene in state["scenes"]
    ]


def _route_generate(state: Graph2State) -> list[Send]:
    return [
        Send("generate_video_scene", {**state, "_current_scene": scene})
        for scene in state["scenes"]
    ]


# ── Graph builders ────────────────────────────────────────────────────────────

def build_analyze_graph():
    """
    START → [Send ×N] analyze_image (parallel) → collect_video_prompts → END
    """
    from graph2.nodes import analyze_image, collect_video_prompts

    b = StateGraph(Graph2State)
    b.add_node("analyze_image",        analyze_image)
    b.add_node("collect_video_prompts", collect_video_prompts)

    b.add_conditional_edges(START, _route_analyze, ["analyze_image"])
    b.add_edge("analyze_image", "collect_video_prompts")
    b.add_edge("collect_video_prompts", END)

    return b.compile()


def build_generate_graph():
    """
    START → [Send ×N] generate_video_scene (parallel) → collect_videos → END
    """
    from graph2.nodes import generate_video_scene, collect_videos

    b = StateGraph(Graph2State)
    b.add_node("generate_video_scene", generate_video_scene)
    b.add_node("collect_videos",       collect_videos)

    b.add_conditional_edges(START, _route_generate, ["generate_video_scene"])
    b.add_edge("generate_video_scene", "collect_videos")
    b.add_edge("collect_videos", END)

    return b.compile()

"""
graph1/graph.py
Assembles the Graph 1 LangGraph StateGraph.

Flow:
  START
    → split_scenes
    → style_bible
    → [Send ×N] build_prompt_scene   (parallel, one per scene)
    → collect_prompts
    → generate_images
    → [Send ×N] layout_text_scene    (parallel, one per scene)
    → collect_layout
    → END
"""

import operator
from typing import Annotated, TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import Send


# ── Graph state ───────────────────────────────────────────────────────────────

class Graph1State(TypedDict):
    invitation_id: str
    input: dict
    style_bible: dict | None
    scenes: list                                      # mutated by split/collect nodes
    _current_scene: dict | None                       # scratch field set per Send worker
    _prompt_results: Annotated[list, operator.add]    # collects from build_prompt_scene
    _layout_results: Annotated[list, operator.add]    # collects from layout_text_scene


# ── Fan-out routers ───────────────────────────────────────────────────────────

def _route_build_prompts(state: Graph1State) -> list[Send]:
    """Fan out one Send per scene to build_prompt_scene."""
    return [
        Send("build_prompt_scene", {**state, "_current_scene": scene})
        for scene in state["scenes"]
    ]


def _route_layout_text(state: Graph1State) -> list[Send]:
    """Fan out one Send per scene to layout_text_scene."""
    return [
        Send("layout_text_scene", {**state, "_current_scene": scene})
        for scene in state["scenes"]
    ]


# ── Graph builder ─────────────────────────────────────────────────────────────

def build_graph():
    from graph1.nodes import (
        build_prompt_scene,
        collect_layout,
        collect_prompts,
        generate_images,
        layout_text_scene,
        split_scenes,
        style_bible,
    )

    b = StateGraph(Graph1State)

    # Register nodes
    b.add_node("split_scenes",       split_scenes)
    b.add_node("style_bible",        style_bible)
    b.add_node("build_prompt_scene", build_prompt_scene)
    b.add_node("collect_prompts",    collect_prompts)
    b.add_node("generate_images",    generate_images)
    b.add_node("layout_text_scene",  layout_text_scene)
    b.add_node("collect_layout",     collect_layout)

    # Edges
    b.add_edge(START, "split_scenes")
    b.add_edge("split_scenes", "style_bible")

    # Fan-out: style_bible → build_prompt_scene ×N (parallel)
    b.add_conditional_edges("style_bible", _route_build_prompts, ["build_prompt_scene"])
    b.add_edge("build_prompt_scene", "collect_prompts")  # all workers converge here

    b.add_edge("collect_prompts", "generate_images")

    # Fan-out: generate_images → layout_text_scene ×N (parallel)
    b.add_conditional_edges("generate_images", _route_layout_text, ["layout_text_scene"])
    b.add_edge("layout_text_scene", "collect_layout")    # all workers converge here

    b.add_edge("collect_layout", END)

    return b.compile()

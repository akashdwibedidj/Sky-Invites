"""Data model for the renderer.

Everything about how an invitation *looks* lives in these models, so editing a
text (or its position, font, animation...) is just changing data and
re-rendering. Nothing is ever baked into the generated image or video.
"""
from __future__ import annotations

from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field, model_validator

InAnimation = Literal["none", "fade", "slide_up", "slide_down", "wipe"]
OutAnimation = Literal["none", "fade"]
Transition = Literal["none", "fade", "fadeblack", "dissolve", "wipeleft", "slideleft", "slideup"]


class Canvas(BaseModel):
    """Output size. Default is 9:16 portrait, 1080x1920."""

    width: int = Field(1080, ge=64)
    height: int = Field(1920, ge=64)
    fps: int = Field(30, ge=10, le=60)


class TextLayer(BaseModel):
    id: str
    text: str
    font: str = "Lora"
    bold: bool = False
    # Font size in px *on a 1080-wide canvas*; scaled automatically for other widths.
    size: int = Field(72, ge=8, le=500)
    color: str = "#FFFFFF"
    align: Literal["left", "center", "right"] = "center"
    # Centre of the text block, as a fraction of canvas width / height.
    x: float = Field(0.5, ge=-0.5, le=1.5)
    y: float = Field(0.5, ge=-0.5, le=1.5)
    # Text wraps to this fraction of the canvas width.
    max_width: float = Field(0.8, gt=0.05, le=1.0)
    line_spacing: float = Field(1.2, ge=0.6, le=3.0)
    stroke_width: int = Field(0, ge=0, le=40)
    stroke_color: str = "#000000"
    shadow: bool = True

    # Timing (seconds, relative to the start of the scene).
    start: float = Field(0.5, ge=0)
    end: float | None = None  # None = until the end of the scene
    anim_in: InAnimation = "fade"
    anim_in_duration: float = Field(0.8, ge=0.05, le=5)
    anim_out: OutAnimation = "fade"
    anim_out_duration: float = Field(0.5, ge=0.05, le=5)

    @model_validator(mode="after")
    def _check_times(self) -> "TextLayer":
        if self.end is not None and self.end <= self.start:
            raise ValueError("end must be later than start")
        return self


class Scene(BaseModel):
    id: str
    clip: Path  # clean video (no text) from the video provider
    # None = use the clip's own length. Shorter trims; longer holds the last frame.
    duration: float | None = Field(None, gt=0)
    layers: list[TextLayer] = Field(default_factory=list)


class Project(BaseModel):
    id: str
    canvas: Canvas = Field(default_factory=Canvas)
    scenes: list[Scene] = Field(min_length=1)
    transition: Transition = "fade"
    transition_duration: float = Field(0.6, ge=0, le=3)
    mute_clip_audio: bool = False

    @model_validator(mode="after")
    def _unique_ids(self) -> "Project":
        ids = [s.id for s in self.scenes]
        if len(ids) != len(set(ids)):
            raise ValueError("scene ids must be unique")
        for s in self.scenes:
            lids = [l.id for l in s.layers]
            if len(lids) != len(set(lids)):
                raise ValueError(f"text layer ids must be unique within scene {s.id}")
        return self

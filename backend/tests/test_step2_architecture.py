"""
test_step2_architecture.py
Comprehensive verification tests for Step 2:
- Category normalization
- Style hierarchy & user overrides (6 categories + general celebration)
- Incompatible style override tests (Wedding + Minimal, Corporate + Watercolor)
- Scene-role composition variations (identity, programme, logistics, closing)
- Photorealism deterministic flag
- Flat 2D stationery directives and negative constraints
- Prompt formatting & regeneration consistency
"""

import json
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from config import (
    VALID_CATEGORIES,
    CATEGORY_STYLE_DEFAULTS,
    THEME_STYLE_OVERRIDES,
    SCENE_ROLE_COMPOSITION,
    normalize_category,
    get_category_rules,
    resolve_style_hierarchy,
    is_photorealism_requested,
    get_scene_composition_strategy,
)
from prompts import STYLE_BIBLE, BUILD_PROMPT
from graph1.nodes import _construct_scene_image_prompt


def test_categories():
    categories = ["Wedding", "Engagement", "Birthday", "Baby Shower", "Anniversary", "Corporate", "Other"]
    for cat in categories:
        norm = normalize_category(cat)
        assert norm in VALID_CATEGORIES, f"Failed normalization for {cat}"
        rules = get_category_rules(norm)
        assert "s1_identity" in rules, f"Missing rules for {norm}"
        assert norm in CATEGORY_STYLE_DEFAULTS, f"Missing style default for {norm}"


def test_theme_overrides():
    # Wedding + Minimal -> Minimalist fine art overrides Mughal miniature
    inv_input = {
        "invitation_type": "wedding",
        "theme": "Minimal",
        "style": "Minimal Luxury",
        "style_description": "Clean lines and negative space",
    }
    resolved = resolve_style_hierarchy("wedding", inv_input)
    assert "Minimalist" in resolved["art_medium"], f"Expected Minimalist medium, got: {resolved['art_medium']}"
    assert "Mughal" not in resolved["art_medium"], "Category default was not overridden by theme"

    # Corporate + Watercolor -> Watercolor corporate invitation
    inv_corp = {
        "invitation_type": "corporate",
        "theme": "Watercolor",
        "style": "Watercolor Luxury",
        "style_description": "Soft artistic washes for corporate annual gala",
    }
    resolved_corp = resolve_style_hierarchy("corporate", inv_corp)
    assert "watercolor" in resolved_corp["art_medium"].lower(), f"Expected watercolor, got: {resolved_corp['art_medium']}"
    assert "Art Deco" not in resolved_corp["art_medium"], "Corporate default was not overridden by Watercolor"


def test_photorealism_deterministic():
    # Default is false
    input_default = {"style_description": "Luxury gold foil stationery"}
    assert not is_photorealism_requested(input_default), "Photorealism should default to False"

    # Enabled only when explicitly requested
    input_photo = {"style_description": "Photorealistic rendering of stationery card"}
    assert is_photorealism_requested(input_photo), "Photorealism should be True when requested"


def test_scene_roles_distinct_composition():
    roles = ["identity", "programme", "logistics", "closing"]
    strategies = [get_scene_composition_strategy(r) for r in roles]

    # Verify each role has a non-empty, distinct strategy
    assert len(set(strategies)) == 4, "Each scene_role must have a distinct composition strategy"
    assert "Grand symmetrical" in strategies[0]
    assert "Structured" in strategies[1]
    assert "Grounded" in strategies[2]
    assert "Softer" in strategies[3]


def test_prompt_generation_and_negative_constraints():
    inv_input = {
        "invitation_type": "wedding",
        "theme": "Royal",
        "style": "Royal Luxury",
        "style_description": "Rich burgundy and gold accents",
        "num_scenes": 4,
    }
    resolved = resolve_style_hierarchy("wedding", inv_input)

    # Style Bible prompt format test
    bible_prompt = STYLE_BIBLE.format(
        category=resolved["category"],
        category_label="Wedding",
        resolved_art_medium=resolved["art_medium"],
        resolved_rendering_style=resolved["rendering_style"],
        resolved_motifs=", ".join(resolved["decorative_motifs"]),
        resolved_textures=", ".join(resolved["textures"]),
        resolved_typography_space=resolved["typography_space"],
        user_vision=resolved["user_vision"],
        photorealism_instruction="STRICTLY NO PHOTOREALISM",
        photorealism_bool="false",
        invitation_json=json.dumps(inv_input),
    )
    assert "FLAT INVITATION ARTWORK" in bible_prompt
    assert "STRICT NEGATIVE CONSTRAINTS" in bible_prompt

    # Mock resolved style bible
    mock_style_bible = {
        "category": "wedding",
        "visual_identity": "Imperial Mughal Luxury Stationery",
        "art_medium": resolved["art_medium"],
        "rendering_style": resolved["rendering_style"],
        "colour_palette": [{"name": "Burgundy", "hex": "#800020"}, {"name": "Gold", "hex": "#D4AF37"}],
        "decorative_motifs": resolved["decorative_motifs"],
        "textures": resolved["textures"],
        "typography_space": resolved["typography_space"],
    }

    # Scene prompt generation for each role
    for idx, role in enumerate(["identity", "programme", "logistics", "closing"]):
        scene = {
            "scene_index": idx,
            "scene_role": role,
            "scene_purpose": f"Scene {idx + 1} purpose",
            "visual_direction": "Stationery background art",
        }
        prompt = _construct_scene_image_prompt(scene, inv_input, mock_style_bible)
        assert "FLAT 2D INVITATION DESIGN ARTWORK" in prompt
        assert role.title() in prompt
        assert "Portrait 9:16" in prompt
        assert "no tabletop photography" in prompt.lower()
        assert "no envelopes" in prompt.lower()


if __name__ == "__main__":
    test_categories()
    test_theme_overrides()
    test_photorealism_deterministic()
    test_scene_roles_distinct_composition()
    test_prompt_generation_and_negative_constraints()
    print("ALL STEP 2 ARCHITECTURE TESTS PASSED SUCCESSFULLY!")

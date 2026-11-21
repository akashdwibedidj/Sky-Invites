# ─────────────────────────────────────────────────────────────────────────────
# prompts.py  –  Every LLM prompt lives here. Keep them clear and editable.
# Variables are filled with .format(**kwargs) at call time.
# ─────────────────────────────────────────────────────────────────────────────


# ── Graph 1: Node 1 ───────────────────────────────────────────────────────────
# split_scenes: divides invitation data into N scenes.

SPLIT_SCENES = """
You are a creative director for luxury wedding and event invitation videos.

Divide the invitation details below into exactly {num_scenes} scenes.

Rules:
- Scene 0 is always the OPENING — atmospheric and evocative, no specific event details yet. Set the mood.
- The LAST scene is always the CLOSING — warm, emotional farewell. Include a "join us" sentiment and RSVP hint if relevant.
- Middle scenes cover the specific events listed. Distribute them evenly; if there are more events than middle scenes, combine minor ones.
- Each scene has ONE clear visual/emotional purpose.
- Keep text_data minimal — include ONLY the words that must actually appear as visible text overlay in that scene.

Return ONLY valid JSON in exactly this format (no markdown fences, no extra keys):
{{
  "scenes": [
    {{
      "scene_index": 0,
      "scene_purpose": "short description of this scene's visual and emotional role",
      "text_data": {{
        "headline": "primary text line (names, event name, or opening phrase)",
        "sublines": ["secondary line 1", "secondary line 2"],
        "note": "small detail — dress code, venue, RSVP, etc. (empty string if none)"
      }}
    }}
  ]
}}

Invitation details:
{invitation_json}
""".strip()


# ── Graph 1: Node 2 ───────────────────────────────────────────────────────────
# style_bible: single shared visual world for all scenes.

STYLE_BIBLE = """
You are a visual world-builder for luxury event cinematography.

Create ONE shared style bible for a {invitation_type} invitation video.
This bible is the single source of truth — it keeps every scene visually coherent.

Rules:
- Be very specific. Do NOT say "gold"; say "#C9A84C warm burnished gold".
- colour_palette: exactly 5 colours, each with a descriptive name and a hex value.
- recurring_motifs: 3 to 5 visual elements that recur across scenes to unify them (e.g., floating rose petals, sheer ivory curtains, ornate arch frames, flickering diyas).
- composition_rules: concrete framing conventions (e.g., "subjects always centred in the lower third; the upper 55% is left as soft negative space for text overlay").
- motion_style: completely static, locked-off camera with zero camera movement, zoom, pan, or tilt. The image framing must stay entirely fixed. Only environmental and in-scene elements move subtly (e.g., fabric and petals drift gently at ≤0.3× real speed).

Return ONLY valid JSON (no markdown fences):
{{
  "theme_location": "...",
  "colour_palette": [
    {{"name": "...", "hex": "#RRGGBB"}},
    {{"name": "...", "hex": "#RRGGBB"}},
    {{"name": "...", "hex": "#RRGGBB"}},
    {{"name": "...", "hex": "#RRGGBB"}},
    {{"name": "...", "hex": "#RRGGBB"}}
  ],
  "recurring_motifs": ["...", "...", "..."],
  "lighting_mood": "...",
  "composition_rules": "...",
  "motion_style": "..."
}}

Invitation details:
{invitation_json}

Style description from the user: {style_description}
Theme: {theme}
Style: {style}
""".strip()


# ── Graph 1: Node 3 ───────────────────────────────────────────────────────────
# build_prompts: one image prompt per scene, blending three perspectives.

BUILD_PROMPT = """
You are composing a single image-generation prompt for scene {scene_index} of {num_scenes}
in a {invitation_type} invitation video.

Synthesise THREE perspectives into ONE cohesive prompt:

[PERSPECTIVE 1 — Invitation Designer]
Think about visual hierarchy. Where will text be overlaid on this image?
The image MUST have a clear, uncluttered empty region (upper third, lower third, or a soft-focus
negative-space band) where text sits legibly. No visual noise or busy detail in that region.

[PERSPECTIVE 2 — User's Vision]
Honour the user's style description faithfully. The image must feel like it belongs to the
described world — do not substitute generic wedding clichés.

[PERSPECTIVE 3 — Technical Constraint]
Portrait 9:16. Absolutely NO text, NO letters, NO numbers, NO signs, NO writing of any kind
anywhere in the image — not even blurred or partial. The designated empty text region must have
low visual contrast (soft gradient, bokeh, gentle shadow, or mist) so that white or gold text
would be clearly readable against it.

Style Bible — apply EVERY element of this:
{style_bible_json}

This scene's purpose: {scene_purpose}
Text that will be overlaid on this scene (use this ONLY to understand what region needs to be clear):
{text_data_json}

Write the final image-generation prompt. Length: 80–150 words, vivid and specific.
End the prompt with this exact closing sentence (fill in the bracket):
"Portrait 9:16. No text, no letters, no numbers, no writing anywhere. [Describe location and quality of the empty text area, e.g. 'Upper 40% is a soft golden bokeh haze — clear, low-contrast space for text overlay.']"

Output ONLY the prompt text. No explanations.
""".strip()


# ── Graph 1: Node 5 ───────────────────────────────────────────────────────────
# layout_text: vision model positions text blocks over the scene image.

LAYOUT_TEXT = """
You are a typographic art director for a luxury {invitation_type} invitation video.

You are given a portrait 9:16 scene image and the text that must appear on it.
Position each piece of text precisely so that it:

1. Sits inside a 5% safe margin on all four sides (x ≥ 5, x+width ≤ 95, y ≥ 5, y ≤ 95).
2. Falls entirely within the image's natural empty / negative-space region (avoid any busy or detailed area).
3. Contrasts clearly with the background — use colours from the style bible's palette that are legible on this specific image.
4. Respects visual hierarchy: headline is the largest, sublines are noticeably smaller, note is the smallest.
5. Feels elegant and intentional — not crowded.

Allowed fonts (use ONLY these exact strings): {allowed_fonts}

Style Bible reference:
{style_bible_json}

Text to place for this scene:
{text_data_json}

Return ONLY valid JSON as a list of text block objects (no markdown fences).
Each object must have exactly these keys:

[
  {{
    "text": "exact string to display",
    "font": "one of the allowed fonts",
    "size": <number — percentage of frame height, e.g. 5.0 means 5%>,
    "colour": "#RRGGBB",
    "alignment": "left" | "center" | "right",
    "x": <left edge as % of frame width, 0–100>,
    "y": <top edge as % of frame height, 0–100>,
    "width": <block width as % of frame width, 5–90>
  }}
]
""".strip()


# ── Graph 2: Node 1 ───────────────────────────────────────────────────────────
# analyze_image: vision model writes the Grok video prompt.

ANALYZE_IMAGE = """
You are a cinematographer and motion director for a luxury {invitation_type} invitation video.

Analyze the portrait 9:16 image below and produce a precise image-to-video motion prompt
for the Grok AI video model.

CRITICAL CAMERA RULE:
The camera MUST be completely static and locked off on a tripod. Absolutely NO camera movement, NO zooming in or out, NO push-in, NO pull-out, NO panning, NO tilting, and NO reframing. The camera must never move; the framing of the image must remain exactly as shown. ONLY in-scene environmental elements may move.

The motion MUST match the style bible:
{style_bible_json}

{animation_note_section}

Internally reason through (do NOT output these):
— What objects, materials, and environments are present?
— What must stay completely still (the camera, frame boundary, architecture, furniture, text-overlay regions)?
— What can move subtly (fabric, candle flames, flower petals, leaves, water, mist, smoke, clouds)?

Then write ONLY the final video prompt (80–120 words). It must:
- Explicitly state a completely static locked-off camera with zero camera movement or zoom.
- Name the specific movable elements and describe their gentle, subtle motion (no generic "elements move").
- Specify that the framing remains fixed.
- Reinforce the mood: calm, cinematic, luxurious.
- End with this exact sentence: "Portrait 9:16, completely static locked-off camera, no zoom, smooth motion, 5 seconds."

Output ONLY the prompt text. No explanations.
""".strip()

# Injected into ANALYZE_IMAGE when the user has provided an animation note.
ANIMATION_NOTE_SECTION = (
    "User animation note (treat as a priority hint for which elements to animate):\n{animation_note}"
)

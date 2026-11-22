# ─────────────────────────────────────────────────────────────────────────────
# prompts.py  –  Every LLM prompt lives here. Keep them clear and editable.
# Variables are filled with .format(**kwargs) at call time.
# Category rules live in config dicts; universal prompts remain category-agnostic.
# ─────────────────────────────────────────────────────────────────────────────


# ── Graph 1: Node 1 ───────────────────────────────────────────────────────────
# split_scenes: divides invitation data into N scenes.

SPLIT_SCENES = """
You are a creative director and stationery designer for luxury invitation stationery videos.

Divide the supplied invitation details into exactly {num_scenes} scenes for a {category_label} invitation.
Internally use zero-based indexing (scene_index 0 to {max_scene_index}).

CATEGORY RULES:
{category_rules_text}


SCENE ALLOCATION STRUCTURE:

Return exactly {num_scenes} scenes.

You must intelligently distribute ALL supplied invitation
information across the requested number of scenes.

Do not use a fixed template blindly. First analyse how much
information is available, then decide the best distribution.

GENERAL RULES:

1. Scene 0 must ALWAYS be the IDENTITY scene.
   It must immediately communicate who or what the invitation
   is for.

2. Every scene must have a clear purpose and a meaningful role
   in the overall invitation sequence.

3. All important supplied information must appear somewhere
   across the complete set of scenes.

4. Never omit factual information simply because the number
   of scenes is limited.

5. Never force unnecessary repetition or meaningless filler
   simply because more scenes have been requested.

6. Keep related information together wherever possible.

7. Arrange scenes in a natural reading order, from introduction
   to event information and finally to closing.

DYNAMIC SCENE ALLOCATION:

A. WHEN ONLY 1 SCENE IS REQUESTED:

- Create one complete invitation.
- Include the identity, hosts, event title, description,
  programme, date, time, venue, address and RSVP wherever
  those details are supplied.
- Organise all information into clear text groups.
- Never sacrifice event details for decorative minimalism.

B. WHEN 2 SCENES ARE REQUESTED:

Scene 1: Identity and Main Invitation
- Hosts or organisation.
- Event title.
- Main invitation message.
- Important introductory information.

Scene 2: Event Information
- Programme or agenda.
- Date and time.
- Venue and complete address.
- RSVP and additional instructions.

Move information between the scenes if necessary to
maintain a balanced layout and preserve all details.

C. WHEN 3 SCENES ARE REQUESTED:

Scene 1: Identity and Invitation Introduction.
Scene 2: Programme, Event Highlights or Main Information.
Scene 3: Date, Time, Venue, Address, RSVP and Closing.

D. WHEN 4 SCENES ARE REQUESTED:

Scene 1: Event Identity and Main Invitation.
Scene 2: Event Introduction, Purpose or Programme.
Scene 3: Date, Time and Schedule.
Scene 4: Venue, Address, RSVP and Closing Message.

E. WHEN 5 SCENES ARE REQUESTED:

Scene 1: Event Identity.
Scene 2: Invitation Introduction and Hosts.
Scene 3: Programme, Agenda or Highlights.
Scene 4: Date, Time, Venue and Location.
Scene 5: RSVP, Additional Instructions and Closing.

F. WHEN 6 OR MORE SCENES ARE REQUESTED:

Create a logical sequence based on the actual information.

Possible scene roles include:

- identity
- invitation_introduction
- event_overview
- programme
- agenda
- event_highlights
- speaker_information
- special_announcements
- date_and_time
- venue_and_location
- additional_information
- rsvp
- closing

Use only roles relevant to the supplied information.

Split lengthy programme details, multiple agenda items,
multiple speakers or multiple event sections into separate
scenes when appropriate.

Do not create unnecessary scenes just to follow this list.

ADAPTIVE INFORMATION DISTRIBUTION:

Before allocating scenes:

1. Identify every unique piece of information supplied.
2. Group related information into logical categories.
3. Estimate the amount of content each scene can comfortably
   accommodate.
4. Distribute information according to the requested scene count.
5. Preserve the natural reading order.
6. Check that no important information has been omitted.

BALANCED SCENE LENGTH:

- Avoid putting almost all the information in the first scene.
- Avoid leaving later scenes unnecessarily empty.
- Distribute content as evenly as practical.
- Keep related details together rather than splitting them
  randomly.
- Short scenes are acceptable when they have a clear purpose.

WHEN THERE IS MORE SCENES THAN AVAILABLE INFORMATION:

This is especially important.

If the user requests more scenes than the amount of unique
information can naturally support:

1. Do not invent event information.
2. Do not create fake programme items, speakers, dates,
   locations or announcements.
3. Do not repeat the same paragraph across multiple scenes.
4. First try splitting longer information into smaller,
   logically connected sections.
5. If there is still insufficient information, create
   visually led supporting scenes with minimal or no text.
6. Give these scenes a meaningful visual storytelling role,
   such as an elegant transition, decorative interlude,
   thematic event artwork or closing visual.
7. Keep the overall invitation sequence coherent and complete.

A scene does not need to contain a large amount of text
to be meaningful.

FINAL COMPLETENESS CHECK:

Before returning the JSON:

- Verify that every supplied factual detail is represented.
- Verify that no information has been invented.
- Verify that no scene is unnecessarily repetitive.
- Verify that every requested scene has a distinct purpose.
- Verify that the sequence reads naturally from beginning
  to end.
- Verify that the number of scenes is exactly {num_scenes}.

The scene allocation must adapt to BOTH the amount of
information supplied and the number of requested scenes.


CONTENT & FACTUALITY RULES:
1. ONLY use facts supplied in the input. NEVER invent names, surnames, milestones, dates, times, venues, addresses, programme items, or RSVP details.
2. If any piece of information is missing from the input, leave that field as an empty string or empty list.
3. Heading is the most important element on the card, followed by subheading.
4. Each scene must have one clear purpose. Do not repeat facts across scenes just to fill space.
5. If there are few details supplied, create meaningful scenes with clear visual direction and minimal, elegant text rather than fabricating information.
6. visual_direction describes the designed stationery backdrop aesthetic for this specific scene (no text inside the image artwork).

7. INFORMATION COMPLETENESS:
   Every unique factual detail supplied by the user must be
   included in at least one scene. Never silently discard
   information.

8. CROSS-SCENE CONSISTENCY:
   Names, dates, times, addresses, event titles and other
   facts must remain exactly consistent across all scenes.

9. NO ARTIFICIAL FILLER:
   Never invent information or repeat paragraphs just to
   fill the requested number of scenes.

10. ADAPTIVE CONTENT DENSITY:
    Scene text length should depend on the amount of available
    information and the number of requested scenes.

11. VISUAL-ONLY SCENES:
    If there is insufficient factual information to fill
    every scene, allow a meaningful visual-only scene with
    empty text fields. Its visual_direction should still
    describe a purposeful part of the invitation collection.


Return ONLY valid JSON (no markdown fences, no explanatory text):
{{
  "scenes": [
    {{
      "scene_index": 0,
      "scene_role": "identity",
      "scene_purpose": "Primary invitation identity announcing hosts and celebrants",
      "visual_direction": "Stationery visual aesthetic for this scene",
      "text_data": {{
        "kicker": "",
        "heading": "",
        "subheading": "",
        "body_lines": [],
        "details": [],
        "date": "",
        "time": "",
        "venue": "",
        "footer": ""
      }}
    }}
  ]
}}

Invitation details:
{invitation_json}
""".strip()


# ── Graph 1: Node 2 ───────────────────────────────────────────────────────────
# style_bible: single shared visual world for all scenes in the stationery suite.


STYLE_BIBLE = """
You are an award-winning corporate visual identity designer and art director
specialising in premium corporate event invitations and digital event branding.

Establish ONE visually rich, sophisticated corporate design identity for a
premium {category_label} invitation stationery suite.

The design must look professionally art-directed, visually engaging,
modern and premium. It must NOT look like a plain background with a simple border.

IMPORTANT DESIGN DIRECTIVES:

1. VISUAL RICHNESS AND DESIGN QUALITY:

   - Create visually rich, layered and detailed invitation artwork.
   - Use multiple complementary decorative elements throughout the composition.
   - Every scene must have a distinctive visual arrangement.
   - Avoid large areas of completely plain, empty background.
   - Never rely only on corner decorations and thin border lines.
   - Make the artwork visually interesting even before typography is added.
   - Decorative elements should be distributed thoughtfully around the canvas.

2. CORPORATE DESIGN LANGUAGE:

   Incorporate suitable corporate design elements such as:

   - Sophisticated geometric patterns and abstract shapes.
   - Layered gradients and dimensional visual elements.
   - Elegant metallic accents and refined highlights.
   - Abstract architectural structures and professional visual framing.
   - Subtle technology-inspired patterns.
   - Connected nodes, digital networks and neural patterns where appropriate.
   - Circuit-board details and digital interface-inspired geometry where appropriate.
   - Abstract light effects, fine particles and controlled illumination.
   - Sophisticated linework, overlapping shapes and depth.

   Select motifs that complement the event category and subject.
   Do not force technology graphics into unrelated event categories.

3. COMPOSITION AND LAYOUT:

   - Create a sophisticated portrait-oriented 2D artwork composition.
   - Use layered decorative elements in the corners, sides, top and bottom.
   - Introduce secondary visual elements to complement the primary motifs.
   - Use asymmetric and balanced compositions where appropriate.
   - Include subtle framing elements, geometric structures and visual depth.
   - Maintain a clear, readable central typography area.
   - Decorative artwork must surround and complement the typography area.
   - Avoid making all four corners identical.
   - Avoid repetitive border-only designs.
   - Each scene should have its own composition while retaining a unified identity.

4. FLAT INVITATION ARTWORK:

   The design represents the graphic surface of premium digital invitation
   stationery, NOT a photograph of a physical card.

   STRICTLY PROHIBITED:

   - No cards placed on tables, desks, fabrics or floors.
   - No envelope mockups or stationery flat-lay photography.
   - No angled camera perspectives or tilted cards.
   - No random real-world event venue photography.
   - No random people, models or human silhouettes.
   - No text, letters, numbers, monograms, logos or pseudo-writing.

5. ART MEDIUM AND RENDERING:

   - Art medium: {resolved_art_medium}
   - Rendering style: {resolved_rendering_style}
   - Key decorative motifs: {resolved_motifs}
   - Surface textures: {resolved_textures}
   - Typography space: {resolved_typography_space}

6. COLOUR AND FINISH:

   - Establish a sophisticated, coordinated colour palette.
   - Use rich background tones with complementary accent colours.
   - Incorporate refined metallic highlights where appropriate.
   - Use controlled lighting, subtle gradients and visual depth.
   - Avoid flat, lifeless or monotonous backgrounds.
   - Ensure sufficient contrast for text overlay.

7. USER VISION OVERRIDES:

   {user_vision}

8. PHOTOREALISM:

   {photorealism_instruction}

9. COLLECTION CONSISTENCY:

   All scenes must look like parts of one professionally designed
   corporate invitation collection.

   Maintain the same visual identity, colour palette, textures,
   decorative language and rendering style across every scene.

   However, vary the actual composition, placement and arrangement
   of decorative elements in each scene.

Return ONLY valid JSON (no markdown fences):

{{
  "category": "{category}",
  "visual_identity": "A premium, visually rich corporate invitation identity",
  "art_medium": "{resolved_art_medium}",
  "rendering_style": "{resolved_rendering_style}",
  "photorealism": {photorealism_bool},
  "colour_palette": [
    {{"name": "colour name 1", "hex": "#RRGGBB"}},
    {{"name": "colour name 2", "hex": "#RRGGBB"}},
    {{"name": "colour name 3", "hex": "#RRGGBB"}},
    {{"name": "colour name 4", "hex": "#RRGGBB"}},
    {{"name": "colour name 5", "hex": "#RRGGBB"}}
  ],
  "decorative_motifs": ["motif 1", "motif 2", "motif 3", "motif 4", "motif 5"],
  "textures": ["texture 1", "texture 2", "texture 3"],
  "composition_rules": "Rich layered corporate artwork with varied decorative arrangements, sophisticated visual framing and a protected central typography area",
  "typography_space": "{resolved_typography_space}",
  "motion_style": "Completely static locked camera; only delicate micro-particles or suitable decorative elements drift subtly",
  "negative_style_constraints": [
    "no tabletop or card mockup photography",
    "no envelopes or physical paper props",
    "no random real-world venue photography",
    "no human figures or silhouettes",
    "no text, letters, numbers or logos in artwork",
    "no plain empty backgrounds with only corner borders"
  ]
}}

Invitation details:

{invitation_json}
""".strip()



# ── Graph 1: Node 3 ───────────────────────────────────────────────────────────
# build_prompts: one image prompt per scene, blending three perspectives.


BUILD_PROMPT = """
You are an award-winning corporate graphic designer and visual art director
creating premium invitation background artwork for scene {scene_index}
of {num_scenes} (Role: {scene_role}) in a luxury {category_label} invitation suite.

Your task is to generate a visually rich, sophisticated and professionally
designed FLAT 2D invitation artwork background.

IMPORTANT: Do not create a plain background with only a thin border
and a few small corner decorations.

SYNTHESISE THESE DESIGN PERSPECTIVES INTO ONE COHESIVE ARTWORK:

[PERSPECTIVE 1 — PREMIUM CORPORATE VISUAL IDENTITY]

Follow the established Style Bible precisely:

- Art Medium: {style_bible_art_medium}
- Rendering Style: {style_bible_rendering_style}
- Colour Palette: {style_bible_palette}
- Decorative Motifs: {style_bible_motifs}
- Textures: {style_bible_textures}
- Visual Identity: {style_bible_identity}

The artwork must feel premium, modern, detailed and professionally designed.

[PERSPECTIVE 2 — RICH DECORATIVE ELEMENTS]

Create a sophisticated arrangement using multiple complementary
decorative elements.

Depending on the event category and visual identity, incorporate:

- Layered geometric shapes and abstract structures.
- Elegant decorative linework and framing elements.
- Abstract architectural patterns.
- Sophisticated gradients and dimensional shapes.
- Metallic gold, silver or other palette-appropriate accents.
- Fine particles and subtle illuminated details.
- Technology-inspired digital patterns where appropriate.
- Connected nodes, neural networks and circuit patterns for technology events.
- Secondary decorative motifs that enrich the composition.

The artwork should contain several clearly visible design elements,
not just a background colour and border.

Decorative details should be visually meaningful and distributed
throughout the composition.

[PERSPECTIVE 3 — SCENE-SPECIFIC COMPOSITION]

Every scene must have a different composition while maintaining
the same corporate visual identity.

- Scene Role: {scene_role}
- Scene Purpose: {scene_purpose}
- Composition Strategy: {scene_composition_strategy}
- Visual Direction: {visual_direction}

Adapt the artwork to the scene's purpose.

Identity scenes should have a strong and memorable visual presence.

Programme scenes should have sophisticated supporting decorative
elements without competing with the content.

Event detail scenes should have elegant framing, subtle visual
accents and clear typography space.

Closing scenes should have a polished, visually satisfying
composition with refined decorative details.

Do not simply reproduce the same corner ornaments and border
arrangement in every scene.

[PERSPECTIVE 4 — VISUAL DEPTH AND COMPOSITION]

Use a combination of:

- Foreground decorative details.
- Midground geometric or abstract elements.
- Background textures and subtle patterns.
- Controlled highlights and dimensional layering.
- Sophisticated visual framing.

Use the full canvas intelligently.

Do not leave the background completely empty.
Do not overcrowd the typography area.
Do not make all decorative elements tiny or barely visible.

The artwork should look complete, detailed and professionally
art-directed even without text.

[PERSPECTIVE 5 — TYPOGRAPHY SAFE AREA]

A clean, low-contrast negative space region must be preserved
inside the safe area for overlay typography.

{typography_space_note}

Decorative elements may surround this region but must never
obstruct the future text placement.

[PERSPECTIVE 6 — STRICT NEGATIVE CONSTRAINTS]

- Flat 2D portrait-oriented invitation artwork.
- NO physical card photography.
- NO tabletop mockups or envelopes.
- NO tilted camera perspectives.
- NO random ballroom or banquet hall photography.
- NO people or human silhouettes.
- NO text, letters, numbers, words, monograms, signatures,
  watermarks or logos anywhere in the artwork.
- NO plain empty backgrounds with only thin borders.
- NO repetitive minimal corner-only decoration.
- NO excessive visual clutter in the typography safe area.

Write a detailed image-generation prompt of 130–190 words.

Prioritise rich decorative artwork, multiple visible design elements,
sophisticated corporate aesthetics, balanced composition and visual depth.

End the prompt with this exact closing sentence:

"Portrait 9:16. Flat 2D invitation stationery design artwork. No text, no letters, no numbers, no words, no signs, no logos, no card mockups, no envelopes, no tabletop photography, no people. [Briefly specify location of empty negative space for typography overlay]."

Output ONLY the prompt text. No explanations.

""".strip()


# ── Graph 1: Node 5 ───────────────────────────────────────────────────────────
# layout_text: vision model positions text layer over the scene image.

LAYOUT_TEXT = """
You are a typographic art director for a luxury invitation video.

You are given a portrait 9:16 scene image and a summary of the text lines that will appear on it.
Determine the visual placement and styling parameters for the text group on this image so it sits elegantly in the image's safe area negative space without overlapping borders or focal artwork:

1. placement: where the text group sits best in the negative space ("top", "center", or "bottom").
2. xOffset: fine horizontal adjustment in percentage (-35 to 35, usually 0).
3. yOffset: fine vertical adjustment in percentage (-40 to 40, usually 0).
4. color: hex code "#RRGGBB" that provides maximum contrast and legibility against the background in that region (e.g. "#FAF6EE" on dark/rich backgrounds, or deep charcoal "#292524" on pale backgrounds).
5. alignment: text alignment ("left", "center", or "right", default "center").
6. fontSize: base font size in pixels for 9:16 preview (18 to 26, default 22).

Safe area rule: Keep text strictly within the inner safe region (avoid outer 10% edges).

Text to be displayed on this scene:
{text_summary}

Return ONLY valid JSON (no markdown fences) in this exact format:
{{
  "placement": "center",
  "xOffset": 0,
  "yOffset": 0,
  "color": "#FAF6EE",
  "alignment": "center",
  "fontSize": 22
}}
""".strip()


# ── Graph 2: Node 1 ───────────────────────────────────────────────────────────
# analyze_image: vision model writes structured animation plan & Grok video prompt.

ANALYZE_IMAGE = """
You are an image-to-video motion analyst and animation director for luxury invitation stationery artwork.
Your objective: identify which existing elements in the artwork can move while preserving the original artwork with 100% fidelity.

DEFAULT ANIMATION MODE:
STATIC CAMERA - SELECTIVE OBJECT ANIMATION.

CAMERA RULE (ABSOLUTE):
- The camera must be completely locked: "Static".
- Zero zoom, pan, tilt, rotation, dolly, parallax, or camera shake.
- Absolutely zero zoom in and zero zoom out effect in the video.
- The first frame and last frame must be identical.
- Requests to animate objects (e.g. "make it animated", "move the flowers", "bring to life") NEVER cause camera movement.
- Camera movement is permitted ONLY if the user explicitly requested camera movement by naming one of the allowed camera moves: "Slow zoom in", "Parallax", "Pan left/right". Otherwise, cameraMovement MUST be "Static".

ELEMENT ANALYSIS RULES:
1. objectsDetected: List 3 to 6 tangible objects, decorative motifs, or materials actually visible in this image.
2. keepStationary: Elements that must remain completely motionless. Always includes: borders, frames, architectural structures, background textures, and the central negative space safe area for typography.
3. shouldMove: Select ONLY objects that actually exist in the image and can move naturally without altering the scene composition (e.g. loose petals, foliage tips, fabric edges, candle flames, water ripples, tiny light particles, subtle shimmer).
   - NEVER invent objects not present in the artwork.
   - If no suitable movable objects exist, shouldMove must be an empty list [].
   - Use plain descriptive words for intensity ("delicate", "subtle", "gentle", "soft") and speed ("very slow", "slow", "gentle", "moderate"). Never use multipliers or percentages like "0.25x".

{animation_note_section}

GROK PROMPT REQUIREMENTS:
Write a vivid, precise 80–120 word image-to-video motion prompt for Grok:
- State clearly that the input image is the source first frame and must be preserved with 100% fidelity.
- Image-to-video animation, NOT scene generation or text-to-video.
- Camera is completely locked and static. Zero zoom in and zero zoom out effect.
- The first frame and the last frame of the video must be identical.
- Only the specific identified movable elements move with delicate, smooth, natural ambient motion.
- All borders, frames, typography negative space, and composition maintain exact position, color, texture, and proportions.
- No cuts, transitions, morphing, warping, new objects, or human figures.
- End with: "Portrait 9:16, completely static locked camera, no zoom in or out, first and last frames identical, subtle ambient motion."

Return ONLY valid JSON (no markdown fences, no explanatory text):
{{
  "objectsDetected": ["..."],
  "keepStationary": ["..."],
  "shouldMove": [
    {{
      "object": "name of detected object",
      "reason": "why this object is suitable for motion",
      "motionType": "drift / sway / flicker / shimmer / ripple",
      "direction": "downward / ambient / horizontal breeze",
      "intensity": "subtle / delicate / gentle",
      "speed": "very slow / slow / gentle"
    }}
  ],
  "cameraMovement": "Static",
  "animationMode": "selective_object_animation",
  "grokPrompt": "..."
}}
""".strip()

# Injected into ANALYZE_IMAGE when the user has provided an animation note.
ANIMATION_NOTE_SECTION = """
USER ANIMATION NOTE:
\"{animation_note}\"
Priority instructions for user note:
- Use this note ONLY to prioritize which existing detected objects to animate.
- If the note mentions an object that does NOT exist in the image, IGNORE that object.
- The note NEVER causes camera movement unless it explicitly requests camera motion by name (e.g. 'slow zoom in', 'parallax', 'pan'). Phrases like 'make it animated' or 'add motion' mean subtle selective object motion with a locked static camera.
""".strip()

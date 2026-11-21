# ─────────────────────────────────────────────────────────────────────────────
# config.py  –  All model names and constants in one place.
# Edit here; never hardcode these values anywhere else.
# ─────────────────────────────────────────────────────────────────────────────

# ── LLM models ───────────────────────────────────────────────────────────────
# Used for split_scenes, style_bible, build_prompts (text-only)
TEXT_LLM_MODEL = "gpt-6-luna"

# Used for layout_text and analyze_image (vision)
VISION_LLM_MODEL = "gpt-6-luna"

# ── Image generation ──────────────────────────────────────────────────────────
IMAGE_MODEL = "gpt-image-2.5-flare"
IMAGE_SIZE = "1152x2048"            # Native 9:16 for generation (9×128 × 16×128)
IMAGE_FINAL_SIZE = (1080, 1920)     # Resized to this after decode
IMAGE_QUALITY = "medium"            # "low" | "medium" | "high"

# ── Video generation ──────────────────────────────────────────────────────────
VIDEO_MODEL = "grok-imagine-video-1.5-lite"
VIDEO_DURATION = 2                  # seconds  (1–15)
VIDEO_RESOLUTION = "480p"          # "480p" | "720p" | "1080p"

# ── Typography ────────────────────────────────────────────────────────────────
# layout_text must pick fonts ONLY from this list.
ALLOWED_FONTS = [
    "Playfair Display",
    "Cormorant Garamond",
    "Great Vibes",
    "Montserrat",
    "Lato",
    "EB Garamond",
]

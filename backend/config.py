# ─────────────────────────────────────────────────────────────────────────────
# config.py  –  All model names, category rules, style defaults, and constants.
# Edit here; never hardcode these values anywhere else.
# ─────────────────────────────────────────────────────────────────────────────
from typing import Any

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

# ── Generation limits (per scene/card) ────────────────────────────────────────
MAX_IMAGE_GENERATIONS_PER_SCENE = 2  # 1 initial generation + 1 regeneration
MAX_VIDEO_GENERATIONS_PER_SCENE = 1  # 1 video generation per card, no regeneration

# ── Timeouts & download caps ──────────────────────────────────────────────────
OPENAI_TEXT_TIMEOUT_SECONDS = 90
OPENAI_IMAGE_TIMEOUT_SECONDS = 180
XAI_VIDEO_TIMEOUT_SECONDS = 600
HTTP_DOWNLOAD_TIMEOUT_SECONDS = 60
VIDEO_DOWNLOAD_MAX_BYTES = 100 * 1024 * 1024  # 100 MB

# ── Rate limits & cost caps ───────────────────────────────────────────────────
RATE_LIMIT_GOOGLE_AUTH = "10/minute"
RATE_LIMIT_RAZORPAY_WEBHOOK = "120/minute"
RATE_LIMIT_CREATE_SCENES = "10/minute"
RATE_LIMIT_ANALYZE_IMAGE = "20/minute"
RATE_LIMIT_GENERATE_IMAGES = "10/minute"
RATE_LIMIT_REGENERATE_IMAGE = "15/minute"
RATE_LIMIT_GENERATE_VIDEO = "5/minute"

DAILY_ANALYZE_IMAGE_CAP = 60
MAX_CREATE_SCENES_RUNS_PER_INVITATION = 3
DAILY_NEW_INVITATIONS_FREE_CAP = 5
DAILY_NEW_INVITATIONS_PAID_CAP = 20

# ── Request & password size limits ────────────────────────────────────────────
MAX_INVITATION_DICT_BYTES = 32768
MAX_INVITATION_FIELD_LEN = 2000
MAX_REGENERATE_INSTRUCTION_LEN = 1000
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 128

# ── Typography ────────────────────────────────────────────────────────────────
# layout_text must pick fonts ONLY from this list.
ALLOWED_FONTS = [
    "Playfair Display",
    "Cormorant Garamond",
    "Cinzel",
    "Bodoni Moda",
    "Fraunces",
    "Lora",
    "Plus Jakarta Sans",
    "DM Sans",
    "Inter",
]

# ── Categories & Category Rules ──────────────────────────────────────────────
VALID_CATEGORIES = {
    "wedding",
    "engagement",
    "birthday",
    "baby shower",
    "anniversary",
    "corporate",
    "general celebration",
}


def normalize_category(category_raw: str | None) -> str:
    """
    Accepts frontend TitleCase or raw strings ('Wedding', 'Baby Shower', 'Baby  Shower', 'Other', etc.).
    Normalizes whitespace and casing.
    Maps 'Other' to 'general celebration' (neutral celebration, NOT corporate).
    Returns a valid backend category from VALID_CATEGORIES.
    """
    if not category_raw:
        return "general celebration"

    cleaned = " ".join(str(category_raw).strip().lower().replace("_", " ").replace("-", " ").split())

    if cleaned in ("other", "celebration", "party", "event", "general"):
        return "general celebration"

    if cleaned in VALID_CATEGORIES:
        return cleaned

    for cat in VALID_CATEGORIES:
        if cat in cleaned or cleaned in cat:
            return cat

    return "general celebration"


CATEGORY_SCENE_RULES: dict[str, dict[str, str]] = {
    "wedding": {
        "label": "Wedding",
        "s1_identity": "Groom & bride names as heading, subheading 'Wedding Celebration', kicker 'Together with their families' (only if families/parents are mentioned).",
        "s2_programme": "Ceremonies, highlights, and agenda items (e.g. Sangeet, Ceremony, Reception). Combine related items. Only include supplied events.",
        "s3_logistics": "Date, time, venue, address. Only include supplied facts.",
        "s4_closing": "Warm closing sentiment plus RSVP details if supplied in the input.",
    },
    "engagement": {
        "label": "Engagement",
        "s1_identity": "Couple names as heading, subheading 'Engagement Celebration' or 'Save the Date'.",
        "s2_programme": "Celebration highlights and agenda. Only supplied items.",
        "s3_logistics": "Date, time, venue, address. Only supplied facts.",
        "s4_closing": "Warm closing line plus RSVP if supplied.",
    },
    "birthday": {
        "label": "Birthday",
        "s1_identity": "Celebrant name as heading, milestone/celebration (e.g. '30th Birthday Celebration') as subheading.",
        "s2_programme": "Party schedule or special activities. Only supplied items.",
        "s3_logistics": "Date, time, venue, address. Only supplied facts.",
        "s4_closing": "Warm celebratory closing line plus RSVP if supplied.",
    },
    "baby shower": {
        "label": "Baby Shower",
        "s1_identity": "'Welcoming Baby' as heading (or baby's name if supplied), parents'/family names as subheading.",
        "s2_programme": "Shower activities, brunch, or games. Only supplied items.",
        "s3_logistics": "Date, time, venue, address. Only supplied facts.",
        "s4_closing": "Warm welcoming closing line plus RSVP/registry note if supplied.",
    },
    "anniversary": {
        "label": "Anniversary",
        "s1_identity": "Couple names as heading, milestone (e.g. '25 Years Together') as subheading.",
        "s2_programme": "Celebration highlights and dinner. Only supplied items.",
        "s3_logistics": "Date, time, venue, address. Only supplied facts.",
        "s4_closing": "Warm closing sentiment plus RSVP if supplied.",
    },
    "corporate": {
        "label": "Corporate",
        "s1_identity": "Official event title as heading, host/organization as subheading, 'Official Event Invitation' as kicker.",
        "s2_programme": "Event agenda, keynote, or panel highlights. Only supplied items.",
        "s3_logistics": "Date, time, venue, address. Only supplied facts.",
        "s4_closing": "Warm formal closing line plus registration/RSVP if supplied.",
    },
    "general celebration": {
        "label": "Celebration",
        "s1_identity": "Celebrant name or event title as heading, 'Celebration Invitation' or event theme as subheading.",
        "s2_programme": "Event schedule or agenda highlights. Only supplied items.",
        "s3_logistics": "Date, time, venue, address. Only supplied facts.",
        "s4_closing": "Warm closing sentiment plus RSVP if supplied.",
    },
}


def get_category_rules(category: str) -> dict[str, str]:
    normalized = normalize_category(category)
    return CATEGORY_SCENE_RULES.get(normalized, CATEGORY_SCENE_RULES["general celebration"])


def build_identity_data(category: str, inv_input: dict[str, Any]) -> dict[str, str]:
    """
    Constructs deterministic identity fields (kicker, heading, subheading) from raw input.
    Never invents names, surnames, or titles not present in inv_input.
    """
    cat = normalize_category(category)
    bride = (inv_input.get("bride_name") or "").strip()
    groom = (inv_input.get("groom_name") or "").strip()
    honoree = (inv_input.get("honoree_name") or "").strip()
    host = (inv_input.get("host_name") or "").strip()
    bride_parents = (inv_input.get("bride_parents") or "").strip()
    groom_parents = (inv_input.get("groom_parents") or "").strip()

    kicker = ""
    heading = ""
    subheading = ""

    if cat == "wedding":
        if groom and bride:
            heading = f"{groom} & {bride}"
        elif groom or bride:
            heading = groom or bride
        elif honoree:
            heading = honoree
        subheading = "Wedding Celebration"
        if bride_parents or groom_parents:
            kicker = "Together with their families"
        elif host:
            kicker = f"Hosted by {host}"

    elif cat == "engagement":
        if groom and bride:
            heading = f"{groom} & {bride}"
        elif groom or bride:
            heading = groom or bride
        elif honoree:
            heading = honoree
        subheading = "Engagement Celebration"
        if host:
            kicker = f"Hosted by {host}"

    elif cat == "birthday":
        heading = honoree or host or "Birthday Celebration"
        subheading = "Birthday Celebration"
        if host and host != honoree:
            kicker = f"Hosted by {host}"

    elif cat == "baby shower":
        heading = "Welcoming Baby"
        if honoree:
            subheading = f"Celebrating {honoree}"
        elif host:
            subheading = f"Hosted by {host}"
        else:
            subheading = "Baby Shower Celebration"

    elif cat == "anniversary":
        if groom and bride:
            heading = f"{groom} & {bride}"
        elif groom or bride:
            heading = groom or bride
        elif honoree:
            heading = honoree
        subheading = "Anniversary Celebration"
        if host:
            kicker = f"Hosted by {host}"

    elif cat == "corporate":
        heading = honoree or host or "Official Gathering"
        if host and host != heading:
            subheading = f"Hosted by {host}"
        else:
            subheading = "Corporate Event"
        kicker = "Official Event Invitation"

    else:  # general celebration
        heading = honoree or host or "Special Celebration"
        subheading = "Celebration Invitation"
        if host and host != heading:
            kicker = f"Hosted by {host}"

    return {
        "kicker": kicker,
        "heading": heading,
        "subheading": subheading,
    }


# ── Step 2: Category Style Defaults ──────────────────────────────────────────

CATEGORY_STYLE_DEFAULTS: dict[str, dict[str, Any]] = {
    "wedding": {
        "art_medium": "Mughal miniature illustration and fine gouache stationery artwork",
        "rendering_style": "Ornamental arched borders, gold-foil detailing, regal symmetrical stationery framing",
        "decorative_motifs": ["floral jali lattice", "ornate mughal arch", "delicate lotus motifs", "burnished gold leaf trim"],
        "textures": ["handmade deckled-edge cotton rag paper", "embossed gold foil"],
        "typography_space": "Upper-to-center generous low-contrast negative space framed by decorative arch borders",
    },
    "engagement": {
        "art_medium": "Modern romantic luxury stationery illustration",
        "rendering_style": "Contemporary elegance, champagne gold accents, delicate geometric framing, airy luxury",
        "decorative_motifs": ["intertwined botanical flourishes", "champagne sparkle line art", "geometric framing", "delicate crest border"],
        "textures": ["heavy textured matte cardstock", "metallic foil-pressed accents"],
        "typography_space": "Centered clear oval or rectangular negative space band with soft luminous gradient",
    },
    "birthday": {
        "art_medium": "Editorial celebration illustration and premium card design",
        "rendering_style": "Bold, vibrant, high-end editorial card artwork, playful sophistication",
        "decorative_motifs": ["refined confetti motifs", "stylized floating balloons", "ribbon flourishes", "metallic party borders"],
        "textures": ["premium coated art card", "glossy spot-varnish accents"],
        "typography_space": "Spacious central or upper negative space framed by dynamic festive border motifs",
    },
    "baby shower": {
        "art_medium": "Watercolor storybook illustration and hand-painted stationery art",
        "rendering_style": "Soft botanicals, delicate washes, pastel tones, whimsical gentle linework",
        "decorative_motifs": ["gentle leafy sprigs", "delicate botanical wreaths", "soft golden starlight dots", "subtle clouds"],
        "textures": ["cold-press textured watercolor paper", "soft deckled edge"],
        "typography_space": "Soft watercolor wash center with low visual noise, framed by delicate floral garland",
    },
    "anniversary": {
        "art_medium": "Vintage luxury stationery illustration and heirloom print art",
        "rendering_style": "Heirloom elegance, timeless metallic accents, laurel framing, classic balanced composition",
        "decorative_motifs": ["laurel leaf wreaths", "intaglio decorative corners", "interlinked filigree flourishes", "silver or gold trim"],
        "textures": ["vintage laid paper", "intaglio engraved metallic leaf"],
        "typography_space": "Classic symmetrical central stationery negative space with soft parchment tone",
    },
    "corporate": {
        "art_medium": "Art Deco architectural graphics and executive stationery illustration",
        "rendering_style": "Geometric precision, premium editorial aesthetic, sleek gilded linework, authoritative elegance",
        "decorative_motifs": ["chevron geometric patterns", "architectural column lines", "minimalist border grids", "brass and bronze accents"],
        "textures": ["heavy smooth linen cardstock", "stamped copper or brass foil linework"],
        "typography_space": "Crisp geometric central negative space framed by clean structured borders",
    },
    "general celebration": {
        "art_medium": "Refined contemporary celebration stationery artwork",
        "rendering_style": "Festive elegance, balanced modern card framing, warm metallic highlights",
        "decorative_motifs": ["golden starbursts", "celebratory ribbon accents", "tasteful modern border"],
        "textures": ["heavy matte cardstock", "subtle metallic sheen"],
        "typography_space": "Clean central open space with soft warm background gradient",
    },
}


THEME_STYLE_OVERRIDES: dict[str, dict[str, Any]] = {
    "minimal": {
        "art_medium": "Minimalist fine-art luxury stationery design",
        "rendering_style": "Clean expansive negative space, ultra-fine hairline geometric borders, restrained elegance, zero visual clutter",
        "decorative_motifs": ["single delicate hairline border", "minimalist corner accents", "subtle metallic rule"],
        "textures": ["ultra-smooth heavy cotton stock", "blind debossing"],
        "typography_space": "Broad, serene negative space occupying the central 70% of the canvas",
    },
    "floral": {
        "art_medium": "Botanical illustration and luxury floral stationery art",
        "rendering_style": "Hand-painted delicate botanicals framing the outer perimeter, airy central negative space",
        "decorative_motifs": ["blooming garden florals", "leafy botanical sprays", "delicate petal border flourishes"],
        "textures": ["fine-milled textured stationery paper", "subtle organic watercolor grain"],
        "typography_space": "Clear central clearing surrounded by perimeter floral wreaths and garlands",
    },
    "watercolor": {
        "art_medium": "Fine-art watercolor stationery painting",
        "rendering_style": "Soft translucent pigment washes, luminous wet-on-dry edges, painterly gradients, gentle paper texture",
        "decorative_motifs": ["soft pigment blooms", "fluid watercolor washes", "delicate metallic dust mist"],
        "textures": ["cold-press textured watercolor paper", "soft deckled edges"],
        "typography_space": "Soft pastel wash center with low visual contrast and no dark brushstrokes",
    },
    "modern": {
        "art_medium": "Contemporary luxury graphic stationery design",
        "rendering_style": "Sleek balanced framing, sharp metallic linework, clean architectural negative space",
        "decorative_motifs": ["fine metallic line rules", "contemporary geometric corners", "subtle gradient transitions"],
        "textures": ["heavy matte cardstock", "foil-stamped line detailing"],
        "typography_space": "Spacious central or upper rectangle framed by sleek contemporary borders",
    },
    "rustic": {
        "art_medium": "Artisanal hand-crafted stationery illustration",
        "rendering_style": "Organic textures, earth-toned botanicals, artisanal linework, warmth and handmade authenticity",
        "decorative_motifs": ["wildflower sprigs", "woodblock botanical accents", "twine and leaf flourishes"],
        "textures": ["kraft or flecked handmade paper", "letterpress impressed linework"],
        "typography_space": "Warm, softly textured central parchment area free of dark obstructions",
    },
    "vintage": {
        "art_medium": "Heirloom vintage stationery engraving and print illustration",
        "rendering_style": "Intaglio linework, ornate filigree corners, timeless aged elegance, classic symmetry",
        "decorative_motifs": ["ornate scrollwork", "vintage cartouche", "filigree borders", "antique etchings"],
        "textures": ["vintage cream laid paper", "intaglio metallic foil stamping"],
        "typography_space": "Classic symmetrical central stationery negative space with soft parchment tone",
    },
    "royal": {
        "art_medium": "Imperial luxury stationery illustration",
        "rendering_style": "Opulent gilded borders, rich jewel-toned or ivory base, regal symmetry, palace ornamentation",
        "decorative_motifs": ["ornate gilded crest", "filigree borders", "burnished gold leaf", "imperial flourishes"],
        "textures": ["heavy velvet-touch cardstock", "embossed gold foil"],
        "typography_space": "Regal central negative space framed by majestic ornate border arches",
    },
    "traditional": {
        "art_medium": "Heritage cultural stationery artwork",
        "rendering_style": "Classic ceremonial ornamentation, auspicious symmetrical motifs, traditional stationery framing",
        "decorative_motifs": ["traditional ornamental borders", "heritage iconography", "ceremonial motifs"],
        "textures": ["handmade artisan paper", "rich foil stamping"],
        "typography_space": "Symmetrical central negative space framed by traditional ceremonial motifs",
    },
}


SCENE_ROLE_COMPOSITION: dict[str, str] = {
    "identity": (
        "Grand symmetrical stationery framing with majestic header and footer border motifs. "
        "Prominent, uncluttered upper-to-center negative space specifically reserved for the primary names and celebration title."
    ),
    "programme": (
        "Structured stationery layout with subtle vertical rhythm and delicate side border dividers. "
        "Generous central column of negative space arranged to accommodate sequential ceremony and agenda details."
    ),
    "logistics": (
        "Grounded, spacious stationery composition with balanced perimeter framing. "
        "Wide open central and lower negative space band tailored for clear readability of date, time, and venue logistics."
    ),
    "closing": (
        "Softer, intimate stationery vignette with gentle framing and serene breathing room. "
        "Open, warm central negative space reserved for a heartfelt farewell sentiment and RSVP details."
    ),
}


def is_photorealism_requested(inv_input: dict[str, Any]) -> bool:
    """
    Deterministic check: Photorealism is FALSE by default.
    Only enabled if the user explicitly requested photographic realism in style_description, theme, style, or message.
    """
    corpus = " ".join([
        str(inv_input.get("style_description") or ""),
        str(inv_input.get("theme") or ""),
        str(inv_input.get("style") or ""),
        str(inv_input.get("message") or ""),
    ]).lower()

    keywords = ["photorealism", "photorealistic", "photo realistic", "real photo", "photograph", "camera shot", "hyperrealistic photo"]
    return any(kw in corpus for kw in keywords)


def get_scene_composition_strategy(scene_role: str) -> str:
    """Returns the composition strategy for a given scene_role."""
    role = (scene_role or "identity").strip().lower()
    return SCENE_ROLE_COMPOSITION.get(role, SCENE_ROLE_COMPOSITION["identity"])


def resolve_style_hierarchy(category: str, inv_input: dict[str, Any]) -> dict[str, Any]:
    """
    Resolves the style parameters according to the strict priority hierarchy:
    1. Explicit user style description
    2. User-selected theme
    3. User-selected style
    4. Category style defaults
    5. Universal fallback
    """
    cat = normalize_category(category)
    cat_default = CATEGORY_STYLE_DEFAULTS.get(cat, CATEGORY_STYLE_DEFAULTS["general celebration"])

    theme_raw = str(inv_input.get("theme") or "").strip().lower()
    theme_override = THEME_STYLE_OVERRIDES.get(theme_raw, {})

    explicit_desc = str(inv_input.get("style_description") or "").strip()
    style_raw = str(inv_input.get("style") or "").strip()

    # Determine art medium & rendering style
    if theme_override:
        art_medium = theme_override["art_medium"]
        rendering_style = theme_override["rendering_style"]
        decorative_motifs = list(theme_override.get("decorative_motifs") or cat_default["decorative_motifs"])
        textures = list(theme_override.get("textures") or cat_default["textures"])
        typography_space = theme_override.get("typography_space") or cat_default["typography_space"]
    else:
        art_medium = cat_default["art_medium"]
        rendering_style = cat_default["rendering_style"]
        decorative_motifs = list(cat_default["decorative_motifs"])
        textures = list(cat_default["textures"])
        typography_space = cat_default["typography_space"]

    # Incorporate explicit user instructions if provided
    user_vision_notes = []
    if explicit_desc:
        user_vision_notes.append(explicit_desc)
    if style_raw and style_raw.lower() not in (theme_raw, f"{theme_raw} luxury"):
        user_vision_notes.append(style_raw)

    return {
        "category": cat,
        "art_medium": art_medium,
        "rendering_style": rendering_style,
        "decorative_motifs": decorative_motifs,
        "textures": textures,
        "typography_space": typography_space,
        "user_vision": "; ".join(user_vision_notes) if user_vision_notes else "Standard luxury stationery suite",
        "photorealism": is_photorealism_requested(inv_input),
    }

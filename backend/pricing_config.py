"""
Centralized pricing, packs, free-tier, and generation rules configuration.
All monetary amounts are stored in paise (1 INR = 100 paise).
"""

from typing import Any

# ── Unit Prices (in paise) ────────────────────────────────────────────────────
UNIT_PRICES_PAISE: dict[str, int] = {
    "image": 5000,   # Rs 50 per card
    "video": 29900,  # Rs 299 per 10-second card
}

# ── Free Tier ─────────────────────────────────────────────────────────────────
FREE_TIER_CREDITS: dict[str, int] = {
    "image": 2,
    "video": 0,
}

# ── Credit Expiry ─────────────────────────────────────────────────────────────
CREDITS_EXPIRE: bool = False

# ── Regeneration & Generation Rules ──────────────────────────────────────────
IMAGE_INITIAL_COST: int = 1
IMAGE_FREE_REGENERATIONS_PER_CARD: int = 1
IMAGE_REGENERATION_COST: int = 0  # Configurable for paid users later

VIDEO_INITIAL_COST: int = 1
VIDEO_FREE_REGENERATIONS_PER_CARD: int = 0
VIDEO_REGENERATION_COST: int | None = None  # None = regeneration not allowed

# ── Startup Sweep Timeout ────────────────────────────────────────────────────
GENERATION_TIMEOUT_MINUTES: int = 15

# ── Packs (all amounts in paise) ──────────────────────────────────────────────
# Discount fields are included so future offers/discounts can be applied cleanly
# without changing the ledger or orders schema.
PLANS: list[dict[str, Any]] = [
    {
        "id": "image_pack_5",
        "name": "Image Pack",
        "description": "5 image credits for your invitation cards",
        "image_credits": 5,
        "video_credits": 0,
        "card_count": 5,
        "fixed_card_count": False,
        "amount_paise": 24900,           # Rs 249
        "original_amount_paise": None,   # For future discount display
        "discount_paise": 0,
        "discount_label": None,
        "currency": "INR",
    },
    {
        "id": "video_invite_30s",
        "name": "Video Invite 30 sec",
        "description": "3 cards with both images and videos",
        "image_credits": 3,
        "video_credits": 3,
        "card_count": 3,
        "fixed_card_count": True,
        "amount_paise": 89900,           # Rs 899
        "original_amount_paise": None,
        "discount_paise": 0,
        "discount_label": None,
        "currency": "INR",
    },
    {
        "id": "video_invite_1m",
        "name": "Video Invite 1 min",
        "description": "6 cards with both images and videos",
        "image_credits": 6,
        "video_credits": 6,
        "card_count": 6,
        "fixed_card_count": True,
        "amount_paise": 179900,          # Rs 1799
        "original_amount_paise": None,
        "discount_paise": 0,
        "discount_label": None,
        "currency": "INR",
    },
]

PLANS_BY_ID: dict[str, dict[str, Any]] = {p["id"]: p for p in PLANS}


def get_effective_pack_amount_paise(pack_id: str) -> int:
    """Server-side price lookup for a pack, accounting for any configured discount."""
    pack = PLANS_BY_ID.get(pack_id)
    if not pack:
        raise ValueError(f"Unknown pack_id: {pack_id}")
    base = int(pack["amount_paise"])
    discount = int(pack.get("discount_paise") or 0)
    return max(0, base - discount)

# ─────────────────────────────────────────────────────────────────────────────
# grok.py  –  Thin wrapper around the xAI image-to-video API.
# Nothing here is graph logic — just the API call and file save.
# ─────────────────────────────────────────────────────────────────────────────

import base64
import os
from pathlib import Path
from urllib.parse import urlparse

import requests
import xai_sdk
from langsmith import traceable

from config import (
    HTTP_DOWNLOAD_TIMEOUT_SECONDS,
    VIDEO_DOWNLOAD_MAX_BYTES,
    VIDEO_DURATION,
    VIDEO_MODEL,
    VIDEO_RESOLUTION,
    XAI_VIDEO_TIMEOUT_SECONDS,
)


@traceable(name="grok_generate_video", metadata={"model": VIDEO_MODEL})
def generate_video(image_path: Path, video_prompt: str, output_path: Path) -> str:
    """Returns the saved video path (str) so LangSmith logs the output, not base64 data."""
    api_key = os.environ.get("XAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("XAI_API_KEY environment variable is required for video generation.")

    client = xai_sdk.Client(api_key=api_key, timeout=XAI_VIDEO_TIMEOUT_SECONDS)

    # Encode image as a base64 data URI
    with open(image_path, "rb") as f:
        b64_data = base64.b64encode(f.read()).decode("utf-8")
    image_data_uri = f"data:image/png;base64,{b64_data}"

    response = client.video.generate(
        model=VIDEO_MODEL,
        prompt=video_prompt,
        image_url=image_data_uri,
        duration=VIDEO_DURATION,
        resolution=VIDEO_RESOLUTION,
    )

    video_url = getattr(response, "url", None) or ""
    parsed = urlparse(video_url)
    if parsed.scheme != "https" or not parsed.netloc:
        raise ValueError("Grok video URL must use HTTPS.")

    # Download and save the video before the temporary link expires
    with requests.get(video_url, stream=True, timeout=HTTP_DOWNLOAD_TIMEOUT_SECONDS) as resp:
        resp.raise_for_status()
        content_type = (resp.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        if content_type and not (content_type.startswith("video/") or content_type == "application/octet-stream"):
            raise ValueError(f"Unexpected video Content-Type: {content_type}")

        output_path.parent.mkdir(parents=True, exist_ok=True)
        total_bytes = 0
        with open(output_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=65536):
                if not chunk:
                    continue
                total_bytes += len(chunk)
                if total_bytes > VIDEO_DOWNLOAD_MAX_BYTES:
                    raise ValueError(f"Downloaded video exceeds max size ({VIDEO_DOWNLOAD_MAX_BYTES} bytes)")
                f.write(chunk)

    return str(output_path)  # logged by LangSmith; base64 data is never sent here

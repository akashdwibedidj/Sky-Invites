# ─────────────────────────────────────────────────────────────────────────────
# grok.py  –  Thin wrapper around the xAI image-to-video API.
# Nothing here is graph logic — just the API call and file save.
# ─────────────────────────────────────────────────────────────────────────────

import base64
import os
from pathlib import Path

import requests
import xai_sdk
from langsmith import traceable

from config import VIDEO_MODEL, VIDEO_DURATION, VIDEO_RESOLUTION


@traceable(name="grok_generate_video", metadata={"model": VIDEO_MODEL})
def generate_video(image_path: Path, video_prompt: str, output_path: Path) -> str:
    """Returns the saved video path (str) so LangSmith logs the output, not base64 data."""
    """
    Send image_path + video_prompt to Grok, wait for the result,
    save the MP4 to output_path, and return output_path.
    """
    client = xai_sdk.Client(api_key=os.environ["XAI_API_KEY"])

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

    # Download and save the video before the temporary link expires
    video_bytes = requests.get(response.url).content
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(video_bytes)

    return str(output_path)  # logged by LangSmith; base64 data is never sent here

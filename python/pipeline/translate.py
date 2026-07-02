import base64
import io
import json
import os
import time
from pathlib import Path
from typing import List

import requests
from PIL import Image
from dotenv import load_dotenv

load_dotenv()

# Overridable via env for paid tiers / newer models.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/"
    f"models/{GEMINI_MODEL}:generateContent"
)
RETRYABLE_STATUS = {429, 500, 502, 503, 504}

# Force a clean JSON array of strings (one translation per region).
RESPONSE_SCHEMA = {"type": "ARRAY", "items": {"type": "STRING"}}


def _api_key() -> str:
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise ValueError("GEMINI_API_KEY not set in environment variables.")
    return key


def _post_with_retry(url: str, payload: dict, attempts: int = 7) -> requests.Response:
    """POST with exponential backoff on transient errors (503/429/timeouts)."""
    delay = 3.0
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            response = requests.post(
                url, headers={"Content-Type": "application/json"}, json=payload, timeout=120
            )
            if response.status_code in RETRYABLE_STATUS:
                last_error = requests.HTTPError(
                    f"{response.status_code} {response.reason}", response=response
                )
                print(f"  Gemini {response.status_code}; retrying in {delay:.0f}s...")
            else:
                response.raise_for_status()
                return response
        except requests.RequestException as error:
            last_error = error
            print(f"  Request error ({error}); retrying in {delay:.0f}s...")

        if attempt < attempts - 1:
            time.sleep(delay)
            delay = min(delay * 2, 60.0)

    raise last_error if last_error else RuntimeError("Gemini request failed")


def _crop_to_b64(image: Image.Image, box: List[float]) -> str:
    x0, y0, x1, y1 = box
    pad_x = (x1 - x0) * 0.06
    pad_y = (y1 - y0) * 0.12
    crop = image.crop(
        (
            max(0, int(x0 - pad_x)),
            max(0, int(y0 - pad_y)),
            min(image.width, int(x1 + pad_x)),
            min(image.height, int(y1 + pad_y)),
        )
    )
    buffer = io.BytesIO()
    crop.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def translate_regions(image_path: Path, boxes: List[List[float]]) -> List[str]:
    """Translate each detected text region to English.

    All region crops are sent in ONE request as an ordered list of images, so
    the returned JSON array maps 1:1 to ``boxes`` by index - accurate placement
    (boxes come from the OCR detector) plus quality translation from Gemini.
    """
    if not boxes:
        return []

    image = Image.open(image_path).convert("RGB")

    parts: List[dict] = [
        {
            "text": (
                "You are translating an East Asian comic (the text may be Korean, "
                "Chinese, or Japanese). Below are "
                f"{len(boxes)} text regions, each as a separate image, in reading "
                "order. Translate each region into natural, concise English suitable "
                "for a speech bubble. Return ONLY a JSON array of exactly "
                f"{len(boxes)} strings - one translation per region, in the same order."
            )
        }
    ]
    for box in boxes:
        parts.append(
            {"inline_data": {"mime_type": "image/png", "data": _crop_to_b64(image, box)}}
        )

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
            "responseSchema": RESPONSE_SCHEMA,
            "thinkingConfig": {"thinkingBudget": 0},
        },
    }

    response = _post_with_retry(f"{GEMINI_URL}?key={_api_key()}", payload)
    raw = response.json()["candidates"][0]["content"]["parts"][0]["text"]
    parsed = json.loads(raw)
    translations = [str(item).strip() for item in parsed] if isinstance(parsed, list) else []

    if len(translations) < len(boxes):
        translations += [""] * (len(boxes) - len(translations))
    return translations[: len(boxes)]

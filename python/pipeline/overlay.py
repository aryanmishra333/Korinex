from pathlib import Path
from typing import Dict, List, Tuple

from PIL import Image, ImageDraw, ImageFont

# Comic-style lettering. The bundled Comic Neue (OFL) ships with the repo so
# translated pages look like real comic dialogue on any machine (server,
# Docker, CI) instead of depending on whatever fonts the OS happens to have.
# The first candidate that loads wins; OS fonts are only fallbacks in case the
# bundled file is missing, and Pillow's bitmap default is the last resort.
_FONTS_DIR = Path(__file__).parent / "fonts"
_FONT_CANDIDATES = [
    str(_FONTS_DIR / "ComicNeue-Bold.ttf"),
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "DejaVuSans.ttf",
    "arial.ttf",
]
_font_cache: Dict[int, ImageFont.FreeTypeFont] = {}


def _get_font(size: int):
    size = max(8, int(size))
    if size in _font_cache:
        return _font_cache[size]
    for path in _FONT_CANDIDATES:
        try:
            font = ImageFont.truetype(path, size)
            _font_cache[size] = font
            return font
        except Exception:  # noqa: BLE001 - try the next candidate
            continue
    font = ImageFont.load_default()
    _font_cache[size] = font
    return font


def _box_bounds(points: List[List[float]]) -> Tuple[float, float, float, float]:
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return min(xs), min(ys), max(xs), max(ys)


def _sample_background(image: Image.Image, box: Tuple[float, float, float, float]) -> Tuple[int, int, int]:
    """Estimate the bubble/panel background color of a text region.

    Samples the pixels around the box's border ring (edges) rather than the
    whole crop. Text sits in the middle, so the border reflects the true
    background - avoiding the muddy gray you get from averaging black text with
    a white bubble (or vice versa).
    """
    x0, y0, x1, y1 = int(box[0]), int(box[1]), int(box[2]), int(box[3])
    x1 = max(x0 + 1, x1)
    y1 = max(y0 + 1, y1)
    crop = image.crop((x0, y0, x1, y1)).convert("RGB")
    width, height = crop.size
    pixels = crop.load()

    step = max(1, min(width, height) // 24)
    reds: List[int] = []
    greens: List[int] = []
    blues: List[int] = []
    for x in range(0, width, step):
        for y in (0, height - 1):
            r, g, b = pixels[x, y]
            reds.append(r)
            greens.append(g)
            blues.append(b)
    for y in range(0, height, step):
        for x in (0, width - 1):
            r, g, b = pixels[x, y]
            reds.append(r)
            greens.append(g)
            blues.append(b)

    def _median(values: List[int]) -> int:
        values.sort()
        return values[len(values) // 2] if values else 255

    return _median(reds), _median(greens), _median(blues)


def _contrast_colors(background: Tuple[int, int, int]):
    """Pick text + outline colors that stay legible on the given background."""
    r, g, b = background
    luminance = 0.299 * r + 0.587 * g + 0.114 * b
    if luminance < 140:
        return (255, 255, 255), (0, 0, 0)  # light text, dark outline
    return (0, 0, 0), (255, 255, 255)  # dark text, light outline


def _line_height(font) -> int:
    # Use the font's true vertical metrics (ascent + descent) plus a little
    # leading. getbbox("Ag") undercounts and causes vertical overflow.
    try:
        ascent, descent = font.getmetrics()
        return int((ascent + descent) * 1.12)
    except Exception:  # noqa: BLE001 - bitmap fallback font
        box = font.getbbox("Ag")
        return (box[3] - box[1]) + 2


def _wrap_text(draw: ImageDraw.ImageDraw, text: str, font, max_width: float) -> List[str]:
    words = text.split()
    if not words:
        return []
    lines: List[str] = []
    current = words[0]
    for word in words[1:]:
        trial = f"{current} {word}"
        if draw.textlength(trial, font=font) <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def _fit_text(
    draw: ImageDraw.ImageDraw, text: str, box_w: float, box_h: float, max_font: float
):
    """Find the largest font size at which the wrapped text fits the box."""
    for size in range(int(max_font), 7, -1):
        font = _get_font(size)
        lines = _wrap_text(draw, text, font, box_w)
        if not lines:
            return font, lines
        total_height = _line_height(font) * len(lines)
        widest = max(draw.textlength(line, font=font) for line in lines)
        if total_height <= box_h and widest <= box_w:
            return font, lines
    smallest = _get_font(8)
    return smallest, _wrap_text(draw, text, smallest, box_w)


def overlay_translations(
    image_path: Path, translated_blocks: List[Dict], output_path: Path
) -> Path:
    """Draw each translation inside the box where its Korean was detected.

    For every block: cover the original text with a white rectangle, then draw
    the English translation wrapped and auto-sized to fit that same box.
    """
    image = Image.open(str(image_path)).convert("RGB")
    draw = ImageDraw.Draw(image)

    for block in translated_blocks:
        # Comic dialogue is traditionally hand-lettered in all caps.
        text = (block.get("translation") or "").strip().upper()
        if not text or text == "[TRANSLATION ERROR]":
            continue

        ox0, oy0, ox1, oy1 = _box_bounds(block["bbox"])
        raw_w = max(1.0, ox1 - ox0)
        raw_h = max(1.0, oy1 - oy0)

        # Sample the original region's background BEFORE masking, so the fill
        # blends in (white bubble stays white, black bubble stays black, etc.).
        background = _sample_background(image, (ox0, oy0, ox1, oy1))

        # Mask: pad beyond the detected box to cover original characters the
        # box may have missed (vision boxes sometimes clip the first/last line).
        # The fill matches the sampled background, so extra padding blends in.
        mx0 = max(0.0, ox0 - raw_w * 0.06)
        my0 = max(0.0, oy0 - raw_h * 0.14)
        mx1 = min(float(image.width), ox1 + raw_w * 0.06)
        my1 = min(float(image.height), oy1 + raw_h * 0.14)
        draw.rectangle([mx0, my0, mx1, my1], fill=background)

        # Text: fit INSIDE the detected box with an inner margin so it never
        # touches the edges or spills out of the bubble.
        margin_x = raw_w * 0.10
        margin_y = raw_h * 0.10
        avail_w = max(1.0, raw_w - 2 * margin_x)
        avail_h = max(1.0, raw_h - 2 * margin_y)

        text_color, outline_color = _contrast_colors(background)
        font, lines = _fit_text(draw, text, avail_w, avail_h, max_font=avail_h)
        if not lines:
            continue
        line_height = _line_height(font)
        total_height = line_height * len(lines)
        stroke_width = max(1, font.size // 18) if hasattr(font, "size") else 1

        text_y = oy0 + max(0.0, (raw_h - total_height) / 2)
        for line in lines:
            line_width = draw.textlength(line, font=font)
            text_x = ox0 + max(0.0, (raw_w - line_width) / 2)
            draw.text(
                (text_x, text_y),
                line,
                fill=text_color,
                font=font,
                stroke_width=stroke_width,
                stroke_fill=outline_color,
            )
            text_y += line_height

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(str(output_path))
    return output_path

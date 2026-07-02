from pathlib import Path
from typing import List

from PIL import Image


def build_pdf(image_paths: List[Path], output_pdf: Path) -> Path:
    """Combine overlayed page images into a single PDF, in page order.

    Callers pass paths already in page order (the pipeline renders zero-padded
    names for exactly this reason), so no fragile string sorting is needed.
    """
    if not image_paths:
        raise ValueError("No overlayed images to build a PDF from.")

    images = [Image.open(str(path)).convert("RGB") for path in image_paths]
    output_pdf = Path(output_pdf)
    output_pdf.parent.mkdir(parents=True, exist_ok=True)
    images[0].save(str(output_pdf), save_all=True, append_images=images[1:])
    return output_pdf

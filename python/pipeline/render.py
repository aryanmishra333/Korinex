from pathlib import Path
from typing import List

import fitz  # PyMuPDF

from .config import DEFAULT_DPI


def render_pdf_to_images(pdf_path: Path, pages_dir: Path, dpi: int = DEFAULT_DPI) -> List[Path]:
    """Render each PDF *page* to a PNG image.

    Unlike extracting embedded image objects (which returns them in storage
    order and can miss or split page content), rendering the page guarantees
    one image per page, in reading order. Files are zero-padded
    (``page-0001.png``) so lexical sorting equals page order everywhere
    downstream.
    """
    pdf_path = Path(pdf_path)
    pages_dir = Path(pages_dir)
    pages_dir.mkdir(parents=True, exist_ok=True)

    document = fitz.open(str(pdf_path))
    try:
        if document.page_count == 0:
            raise ValueError(f"PDF has no pages: {pdf_path}")

        rendered: List[Path] = []
        for index in range(document.page_count):
            page = document.load_page(index)
            pixmap = page.get_pixmap(dpi=dpi)
            out_path = pages_dir / f"page-{index + 1:04d}.png"
            pixmap.save(str(out_path))
            rendered.append(out_path)
        return rendered
    finally:
        document.close()

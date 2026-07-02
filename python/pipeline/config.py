from dataclasses import dataclass
from pathlib import Path

# Render resolution for PDF pages. 200 DPI is a good balance of OCR quality
# vs. image size for manhwa pages.
DEFAULT_DPI = 200


@dataclass
class Workspace:
    """Per-job directory layout.

    Everything for a single translation job lives under one ``root`` so that
    concurrent jobs never share files. This is what makes per-job isolation
    (a later phase) trivial: give each job its own root.
    """

    root: Path

    @property
    def pages(self) -> Path:
        return self.root / "pages"

    @property
    def translations(self) -> Path:
        return self.root / "translations"

    @property
    def overlay(self) -> Path:
        return self.root / "overlay"

    @property
    def output_pdf(self) -> Path:
        return self.root / "output.pdf"

    def ensure(self) -> "Workspace":
        for directory in (self.pages, self.translations, self.overlay):
            directory.mkdir(parents=True, exist_ok=True)
        return self

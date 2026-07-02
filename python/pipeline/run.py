import argparse
import json
import time
from pathlib import Path
from typing import List, Optional

from .build_pdf import build_pdf
from .config import DEFAULT_DPI, Workspace
from .detect import detect_text_clusters
from .overlay import overlay_translations
from .render import render_pdf_to_images
from .translate import translate_regions


def run_pipeline(
    pdf_path: str,
    work_dir: str,
    dpi: int = DEFAULT_DPI,
    project_id: Optional[str] = None,
) -> Path:
    """Run the full translation pipeline for one PDF into an isolated work dir.

    Stages: render pages -> EasyOCR detector (accurate text boxes) -> Gemini
    translation of each region -> overlay English into each box -> rebuild PDF.
    Intermediate JSON is written per page so later phases can cache and resume.
    """
    source = Path(pdf_path)
    if not source.exists():
        raise FileNotFoundError(f"Input PDF not found: {source}")

    workspace = Workspace(Path(work_dir)).ensure()
    label = f"[{project_id}] " if project_id else ""

    print(f"{label}Rendering pages from {source.name}...")
    page_images = render_pdf_to_images(source, workspace.pages, dpi=dpi)
    print(f"{label}Rendered {len(page_images)} page(s).")

    overlayed: List[Path] = []
    for index, page_image in enumerate(page_images):
        stem = page_image.stem

        # Pace requests to stay under free-tier rate limits.
        if index > 0:
            time.sleep(4)

        print(f"{label}Detecting text in {stem}...")
        boxes = detect_text_clusters(page_image)
        print(f"{label}  {len(boxes)} text region(s) found; translating...")
        translations = translate_regions(page_image, boxes)
        blocks = [
            {
                "bbox": [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]],
                "original": "",
                "translation": translation,
            }
            for b, translation in zip(boxes, translations)
        ]
        (workspace.translations / f"{stem}.json").write_text(
            json.dumps(blocks, ensure_ascii=False, indent=2), encoding="utf-8"
        )

        out_image = workspace.overlay / page_image.name
        overlay_translations(page_image, blocks, out_image)
        overlayed.append(out_image)

    print(f"{label}Building PDF...")
    output_pdf = build_pdf(overlayed, workspace.output_pdf)
    print(f"{label}Done -> {output_pdf}")
    return output_pdf


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Korinex Korean manhwa translation pipeline"
    )
    parser.add_argument("--pdf", required=True, help="Path to the input Korean PDF")
    parser.add_argument(
        "--work-dir",
        required=True,
        help="Directory for this job's intermediate files and output.pdf",
    )
    parser.add_argument(
        "--project-id", default=None, help="Optional project id used for log labelling"
    )
    parser.add_argument(
        "--dpi", type=int, default=DEFAULT_DPI, help="Render resolution (default 200)"
    )
    args = parser.parse_args()
    run_pipeline(
        args.pdf, args.work_dir, dpi=args.dpi, project_id=args.project_id
    )


if __name__ == "__main__":
    main()

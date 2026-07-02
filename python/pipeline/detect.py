from pathlib import Path
from typing import List

import easyocr

# EasyOCR's CRAFT text detector is language-agnostic and locates text regions
# far more precisely than a vision LLM's bounding boxes. We use ONLY its
# detector (not recognition) to get accurate boxes, and let Gemini translate.
_reader = None


def _get_reader():
    global _reader
    if _reader is None:
        # Recognition language is irrelevant here since we only call detect();
        # 'ko' is used because that model is already cached.
        _reader = easyocr.Reader(["ko"], gpu=False)
    return _reader


def _detect_line_boxes(image_path: Path) -> List[List[float]]:
    """Return per-line text boxes as [x0, y0, x1, y1]."""
    reader = _get_reader()
    horizontal_list, free_list = reader.detect(str(image_path))

    boxes: List[List[float]] = []
    for x_min, x_max, y_min, y_max in horizontal_list[0]:
        boxes.append([float(x_min), float(y_min), float(x_max), float(y_max)])
    for polygon in free_list[0]:
        xs = [point[0] for point in polygon]
        ys = [point[1] for point in polygon]
        boxes.append([float(min(xs)), float(min(ys)), float(max(xs)), float(max(ys))])
    return boxes


def _gap(a0: float, a1: float, b0: float, b1: float) -> float:
    return max(0.0, max(a0, b0) - min(a1, b1))


def _near(a: List[float], b: List[float], x_gap: float, y_gap: float) -> bool:
    return (
        _gap(a[0], a[2], b[0], b[2]) <= x_gap
        and _gap(a[1], a[3], b[1], b[3]) <= y_gap
    )


def _union(a: List[float], b: List[float]) -> List[float]:
    return [min(a[0], b[0]), min(a[1], b[1]), max(a[2], b[2]), max(a[3], b[3])]


def _cluster_boxes(boxes: List[List[float]]) -> List[List[float]]:
    """Group nearby line boxes into per-bubble clusters via connected components."""
    if not boxes:
        return []

    heights = sorted(box[3] - box[1] for box in boxes)
    line_height = heights[len(heights) // 2] or 1.0
    x_gap = line_height * 0.9
    y_gap = line_height * 0.8

    parent = list(range(len(boxes)))

    def find(i: int) -> int:
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    def union(i: int, j: int) -> None:
        ri, rj = find(i), find(j)
        if ri != rj:
            parent[ri] = rj

    for i in range(len(boxes)):
        for j in range(i + 1, len(boxes)):
            if _near(boxes[i], boxes[j], x_gap, y_gap):
                union(i, j)

    groups: dict = {}
    for i in range(len(boxes)):
        groups.setdefault(find(i), []).append(boxes[i])

    clusters: List[List[float]] = []
    for group in groups.values():
        merged = group[0]
        for box in group[1:]:
            merged = _union(merged, box)
        clusters.append(merged)

    # Reading order: top-to-bottom (banded), then left-to-right.
    clusters.sort(key=lambda b: (round(b[1] / (line_height * 2)), b[0]))
    return clusters


def detect_text_clusters(image_path: Path) -> List[List[float]]:
    """Detect text and return accurate per-bubble boxes as [x0, y0, x1, y1]."""
    return _cluster_boxes(_detect_line_boxes(image_path))

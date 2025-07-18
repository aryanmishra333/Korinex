import os
import json
import easyocr
from pathlib import Path

IMAGE_FOLDER = "output"
OUTPUT_FOLDER = "ocr_results"
os.makedirs(OUTPUT_FOLDER, exist_ok=True)
reader = easyocr.Reader(['ko'], gpu=False)

for filename in sorted(os.listdir(IMAGE_FOLDER)):
    if filename.lower().endswith((".jpg", ".jpeg", ".png")):
        image_path = os.path.join(IMAGE_FOLDER, filename)
        print(f"Processing {filename}...")
        results = reader.readtext(image_path, detail=1, paragraph=False)
        ocr_data = []
        for bbox, text, confidence in results:
            ocr_data.append({
                "bbox": [[float(coord) for coord in point] for point in bbox],
                "text": text.strip(),
                "confidence": float(confidence)
            })
        output_path = os.path.join(OUTPUT_FOLDER, f"{Path(filename).stem}.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(ocr_data, f, ensure_ascii=False, indent=2)
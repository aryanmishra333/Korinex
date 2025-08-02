import os
import json
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path


IMAGE_FOLDER = "output"
OCR_FOLDER = "ocr_results"
TRANSLATION_FOLDER = "translations"
OVERLAY_FOLDER = "overlayed"
os.makedirs(OVERLAY_FOLDER, exist_ok=True)

def overlay_text_on_image(image_path, ocr_data, translations):
    image = Image.open(image_path)
    draw = ImageDraw.Draw(image)
    
    # Try to load a font, fall back to default if not available
    try:
        font = ImageFont.truetype("arial.ttf", 20)
    except:
        font = ImageFont.load_default()

    if translations:
        text = translations[0] if len(translations) > 0 else "Translation"
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        x = (image.width - text_width) // 2
        y = (image.height - text_height) // 2
        
        # Draw white background
        draw.rectangle([x-5, y-5, x+text_width+5, y+text_height+5], fill="white")
        # Draw text
        draw.text((x, y), text, fill="black", font=font)
    
    return image

# Process each image
for filename in sorted(os.listdir(IMAGE_FOLDER)):
    if filename.lower().endswith((".jpg", ".jpeg", ".png")):
        image_path = os.path.join(IMAGE_FOLDER, filename)
        stem = Path(filename).stem
        
        # Load OCR data
        ocr_path = os.path.join(OCR_FOLDER, f"{stem}.json")
        ocr_data = []
        if os.path.exists(ocr_path):
            with open(ocr_path, 'r', encoding='utf-8') as f:
                ocr_data = json.load(f)
        
        # Load translations
        trans_path = os.path.join(TRANSLATION_FOLDER, f"{stem}.txt")
        translations = []
        if os.path.exists(trans_path):
            with open(trans_path, 'r', encoding='utf-8') as f:
                translations = [line.strip() for line in f.readlines() if line.strip()]
        
        # Create overlayed image
        overlayed_image = overlay_text_on_image(image_path, ocr_data, translations)
        
        # Save overlayed image
        output_path = os.path.join(OVERLAY_FOLDER, filename)
        overlayed_image.save(output_path)
        print(f"Overlayed {filename}")

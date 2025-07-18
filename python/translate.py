import os
import json
import requests
from dotenv import load_dotenv
OCR_FOLDER = "ocr_results"
TRANSLATION_FOLDER = "translations"

load_dotenv()
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    raise ValueError("GEMINI_API_KEY not set in environment variables.")
os.makedirs(TRANSLATION_FOLDER, exist_ok=True)

def build_prompt(korean_text: str) -> str:
    return f"""You are a Korean-English translator with expertise in manhwa dialogue.\nTranslate the following Korean text:\n{korean_text}\nReturn only the translated English sentence."""

def translate(text: str) -> str:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={API_KEY}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": build_prompt(text)}]}],
        "generationConfig": {
            "temperature": 0.3,
            "topK": 40,
            "topP": 0.8,
            "maxOutputTokens": 256
        }
    }
    try:
        res = requests.post(url, headers=headers, json=payload, timeout=30)
        data = res.json()
        return data['candidates'][0]['content']['parts'][0]['text'].strip()
    except Exception as e:
        print(f"Translation failed: {text[:20]}... — {e}")
        return "[Translation Error]"

for filename in sorted(os.listdir(OCR_FOLDER)):
    if filename.endswith(".json"):
        ocr_path = os.path.join(OCR_FOLDER, filename)
        out_path = os.path.join(TRANSLATION_FOLDER, filename.replace(".json", ".txt"))
        with open(ocr_path, 'r', encoding='utf-8') as f:
            ocr_data = json.load(f)
        translations = [translate(block['text']) for block in ocr_data if block['text'].strip()]
        with open(out_path, 'w', encoding='utf-8') as out:
            out.write("\n".join(translations))
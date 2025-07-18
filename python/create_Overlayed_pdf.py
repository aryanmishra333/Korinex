from PIL import Image
import os

overlay_folder = "overlayed"
output_pdf = "final_translated_output.pdf"
image_files = sorted([
    os.path.join(overlay_folder, f)
    for f in os.listdir(overlay_folder)
    if f.lower().endswith((".png", ".jpg", ".jpeg"))
])
images = [Image.open(img).convert("RGB") for img in image_files]
if images:
    images[0].save(output_pdf, save_all=True, append_images=images[1:])
    print(f"PDF saved as: {output_pdf}")
else:
    print("No images found.")
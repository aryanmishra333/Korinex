import fitz
import os
from PIL import Image

file_path = "input/main-raw.pdf"
pdf_file = fitz.open(file_path)

images_list = []
for page_num in range(len(pdf_file)):
    page_content = pdf_file[page_num]
    images_list.extend(page_content.get_images())

if len(images_list) == 0:
    raise ValueError("No images found in the PDF file.")

for img_index, img in enumerate(images_list, start=1):
    xref = img[0]
    base_image = pdf_file.extract_image(xref)
    image_bytes = base_image["image"]
    image_ext = base_image["ext"]
    image_filename = str(img_index) + "." + image_ext
    with open(os.path.join("output/", image_filename), "wb") as image_file:
        image_file.write(image_bytes)
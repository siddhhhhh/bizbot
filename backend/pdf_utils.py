import fitz  # PyMuPDF
import os
import uuid

def extract_text_from_pdf(pdf_path: str) -> str:
    with fitz.open(pdf_path) as doc:
        return "\n".join([page.get_text() for page in doc])

def extract_images_from_pdf(pdf_path: str, output_dir: str = "extracted_images") -> list:
    image_paths = []
    seen_xrefs = set()

    # 🧹 Clean previous images
    if os.path.exists(output_dir):
        for filename in os.listdir(output_dir):
            file_path = os.path.join(output_dir, filename)
            if os.path.isfile(file_path):
                os.remove(file_path)
    else:
        os.makedirs(output_dir)

    with fitz.open(pdf_path) as doc:
        for page_num, page in enumerate(doc):
            images = page.get_images(full=True)

            for img_index, img in enumerate(images):
                xref = img[0]
                if xref in seen_xrefs:
                    continue  # ✋ skip if already saved
                seen_xrefs.add(xref)

                pix = fitz.Pixmap(doc, xref)

                if pix.n < 5:  # GRAY or RGB
                    img_path = os.path.join(
                        output_dir, f"page{page_num + 1}_img{img_index + 1}_{uuid.uuid4().hex[:8]}.png"
                    )
                    pix.save(img_path)
                    image_paths.append(img_path)
                else:  # CMYK
                    pix = fitz.Pixmap(fitz.csRGB, pix)
                    img_path = os.path.join(
                        output_dir, f"page{page_num + 1}_img{img_index + 1}_{uuid.uuid4().hex[:8]}.png"
                    )
                    pix.save(img_path)
                    image_paths.append(img_path)

                pix = None  # Clean up mem leak just in case

    return image_paths
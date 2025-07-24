from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from llm_utils import generate_summary_with_llama, answer_with_groq as answer_with_gemini, text_to_speech

import os
import uuid

# Load environment variables from .env
load_dotenv()
from pdf_utils import extract_text_from_pdf, extract_images_from_pdf

app = FastAPI()

# Allow frontend CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

state = {
    "summary": "",
    "chat_history": [],
    "pdf_text": "",
}

os.makedirs("extracted_images", exist_ok=True)

class QuestionRequest(BaseModel):
    question: str

class SummaryRequest(BaseModel):
    summary: str

@app.get("/")
def root():
    return {"message": "BizBot backend is running 💼✨"}

@app.post("/analyze-pdf/")
async def analyze_pdf(file: UploadFile = File(...)):
    try:
        # Save uploaded file
        file_id = str(uuid.uuid4())
        file_path = f"temp_{file_id}.pdf"
        with open(file_path, "wb") as f:
            f.write(await file.read())

        # Extract text and images
        pdf_text = extract_text_from_pdf(file_path)
        image_paths = extract_images_from_pdf(file_path, output_dir="extracted_images")

        # Generate & clean summary (remove asterisks)
        raw_summary = generate_summary_with_llama(pdf_text)
        clean_summary = raw_summary.replace("*", "").strip()

        # Update app state
        state["summary"] = clean_summary
        state["pdf_text"] = pdf_text
        state["chat_history"] = []

        os.remove(file_path)

        return {
            "summary": clean_summary,  # <== FIXED: send clean version!
            "page_count": pdf_text.count("") + 1,
            "word_count": len(pdf_text.split()),
            "images": image_paths,
        }

    except Exception as e:
        print("🔥 PDF analysis failed:", str(e))
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/ask-question/")
async def ask_question(req: QuestionRequest):
    try:
        answer = answer_with_gemini(req.question, state["summary"])
        state["chat_history"].append({"question": req.question, "answer": answer})
        return {"answer": answer}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/narrate-answer/")
async def narrate_answer(req: SummaryRequest):
    try:
        if not req.summary.strip():
            return JSONResponse(status_code=400, content={"error": "No text to narrate."})
        
        print("🎙️ Narrating answer:", req.summary[:50])  # Log preview
        audio_path = text_to_speech(req.summary, filename="last-answer-audio.mp3")
        return FileResponse(audio_path, media_type="audio/mpeg")
    except Exception as e:
        print("🔥 Narrate answer failed:", str(e))
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/download-summary/")
async def download_summary(req: SummaryRequest):
    from fpdf import FPDF

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    for line in req.summary.split("\n"):
        pdf.multi_cell(0, 10, line)

    path = "summary.pdf"
    pdf.output(path)
    return FileResponse(path, filename="summary.pdf", media_type="application/pdf")

@app.post("/narrate-summary/")
async def narrate_summary(req: SummaryRequest):
    try:
        if not req.summary.strip():
            return JSONResponse(status_code=400, content={"error": "No summary to narrate."})

        print("🎙️ Narrating summary:", req.summary[:50])
        audio_path = text_to_speech(req.summary, filename="summary-audio.mp3")
        return FileResponse(audio_path, media_type="audio/mpeg")
    except Exception as e:
        print("🔥 Narrate summary failed:", str(e))
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/clear-chat/")
async def clear_chat():
    state["chat_history"] = []
    return {"message": "Chat history cleared"}

@app.get("/last-answer-audio.mp3")
async def get_last_answer_audio():
    path = "last-answer-audio.mp3"
    if os.path.exists(path):
        return FileResponse(path, media_type="audio/mpeg")
    return JSONResponse(status_code=404, content={"error": "Audio not found"})

@app.get("/extracted_images/{image_name}")
async def get_extracted_image(image_name: str):
    path = os.path.join("extracted_images", image_name)
    if os.path.exists(path):
        return FileResponse(path, media_type="image/png")
    return JSONResponse(status_code=404, content={"error": "Image not found"})

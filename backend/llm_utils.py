import os
from gtts import gTTS
from dotenv import load_dotenv
import requests

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

def call_groq_llm(prompt: str, system: str = "You are a helpful business analyst AI.") -> str:
    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama3-8b-8192",  # or mixtral-8x7b-32768
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.7
            }
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        print("🔥 Groq LLM failed:", str(e))
        return "Something went wrong while calling Groq LLaMA."

# Summary generation
def generate_summary_with_llama(pdf_text: str) -> str:
    prompt = f"Please summarize the following PDF content clearly and concisely:\n\n{pdf_text}"
    return call_groq_llm(prompt)

# Q&A with context
def answer_with_groq(question: str, context: str) -> str:
    prompt = f"""
You are an expert business assistant. Use the following PDF summary to answer the user's question.

Summary:
{context}

Question:
{question}

Answer briefly and clearly:
"""
    return call_groq_llm(prompt)


def text_to_speech(text: str, filename: str = "speech.mp3") -> str:
    tts = gTTS(text=text, lang='en')
    path = os.path.join("output_audio", filename)
    os.makedirs("output_audio", exist_ok=True)
    tts.save(path)
    return path

from gtts import gTTS

def text_to_speech(text: str, filename="output.mp3") -> str:
    try:
        if not text.strip():
            raise ValueError("Empty text passed to TTS.")
        tts = gTTS(text=text, lang='en')
        tts.save(filename)
        return filename
    except Exception as e:
        print("🔥 TTS failed:", str(e))
        raise


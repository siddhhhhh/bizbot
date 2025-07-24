# 💼 BizBot — Your Smart PDF Analyst

BizBot is a powerful GenAI-driven web application that transforms boring business documents into intelligent, interactive insights. Upload a PDF and unlock summaries, Q&A sessions, image previews, and even voice narrations — all in one clean, fast, and beautiful interface. BizBot isn't just another PDF summarizer — it’s a day-to-day business assistant with LLM brains, audio personality, and visual understanding. Use it for reports, financial docs, meeting minutes, research papers — anything.

<!-- Optional: Replace with your banner -->

---

🚀 Features

📄 PDF Intelligence
- Extracts clean, structured text from your uploaded PDF
- Summarizes key insights using **Groq + Gemini via free APIs**
- Handles multi-page PDFs with support for moderate size limits

🧠 Q&A with Context
- Ask questions about your document and get AI-powered answers
- Uses **Groq + Gemini via free APIs** for blazing fast, smart responses
- Maintains full chat history during the session

🖼️ Image & Chart Extraction
- Automatically extracts and displays embedded images or graphs
- Images are stored with unique filenames and served directly via FastAPI

🎙️ Narrated Insights Mode (Unique Feature)
- Converts the summary into an **AI-generated voice narration**
- You can play the audio directly in-app or **download the .mp3**
- Separate narration available for both the **summary** and **answers**

🗣️ Voice-Based Interaction (Front-End Only)
- Speak your questions to the bot (Speech-to-Text)
- Optionally hear the answers read aloud by the bot (Text-to-Speech)
- Fully browser-based, no extra backend setup needed

📥 Downloadable Summary
- Download your summarized insights as a clean **PDF file**
- Auto-cleans unnecessary symbols like asterisks for a smoother read

---

 🧼Bonus Utilities
 
✅ Clear Chat button to reset history

🔊 Hear Answer button for every reply

🔊 Hear Summary for narrated overview

📄 Download Summary for offline sharing

🖼️ Image Viewer from PDF pages



🧑‍💻 Setup Instructions

🔌 Backend (FastAPI)

git clone https://github.com/siddhhhh/bizbot.git

cd bizbot/backend

pip install -r requirements.txt


# Start backend
uvicorn main:app --reload

Create a .env file with:
GROQ_API_KEY=your_groq_key

🖥️ Frontend (Next.js with Vercel v0)

cd bizbot/frontend

npm install

npm run dev

# ⚡ Contexa — RAG Document Q&A System

> A powerful Retrieval-Augmented Generation (RAG) system built with **React + Vite**, **Node.js + Express**, and **Python (internal AI service)**. Upload documents, ask questions, get source-cited answers powered by Google Gemini.

---

## Architecture

```
React + Vite (Port 5173)
    │ HTTP / SSE
    ▼
Node.js + Express (Port 3001)   ← JWT Auth, Multer Upload, Rate Limit
    │ HTTP (internal)
    ▼
Python FastAPI (Port 8000)       ← Gemini API, ChromaDB, BM25
    │
    ▼
ChromaDB (Local) + Gemini API
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- A Gemini API key from [Google AI Studio](https://aistudio.google.com)

### 1. Copy and configure `.env`
```bash
copy .env.example backend\.env
copy .env.example ai-service\.env
# Edit both files and add your GEMINI_API_KEY
```

### 2. Install Python dependencies
```bash
python -m venv ai-service\venv
ai-service\venv\Scripts\activate
pip install -r ai-service\requirements.txt
```

### 3. Start Python AI Service (Terminal 1)
```bash
ai-service\venv\Scripts\python ai-service\main.py
# Runs on http://localhost:8000
```

### 4. Start Express Backend (Terminal 2)
```bash
cd backend
npm run dev
# Runs on http://localhost:3001
```

### 5. Start React Frontend (Terminal 3)
```bash
cd frontend
npm run dev
# Open http://localhost:5173
```

> **Or use the single start script:** `.\start.ps1`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| State | Zustand |
| Animations | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |
| API Gateway | Node.js + Express.js |
| Auth | JWT + bcryptjs |
| File Upload | Multer |
| Rate Limiting | express-rate-limit |
| AI Microservice | Python 3.11 + FastAPI |
| LLM | Google Gemini 2.5 Flash |
| Embeddings | Gemini text-embedding-004 |
| Vector DB | ChromaDB (persistent local) |
| Hybrid Search | ChromaDB + BM25 (RRF fusion) |
| Logging | structlog (Python) + morgan (Node) |

---

## Features

- 📄 Upload PDF, DOCX, TXT, Markdown files (up to 50MB)
- 💬 Streaming chat with real-time token display
- 🔍 Hybrid search (vector + BM25) for superior recall
- 📎 Source citation for every answer
- 👍 Thumbs up/down feedback system
- 📊 Analytics dashboard (queries, latency, feedback)
- ⚙️ Settings panel to tune all RAG parameters live
- 🔐 JWT authentication (register/login)
- 📦 Async document processing (no blocking)
- ♻️ Query rewriting for better retrieval

---

## Project Structure

```
contexa/
├── frontend/          # React + Vite
├── backend/           # Node.js + Express
├── ai-service/        # Python FastAPI (internal)
├── config/            # settings.yaml
├── data/              # uploads + chroma_db
├── .env.example
└── start.ps1          # Start all services
```

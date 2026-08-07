# ============================================================
#  DocLib — AI Service Dockerfile
#  Python 3.11 + FastAPI + ChromaDB + Sentence Transformers
# ============================================================

# python:3.11-slim is ~130MB vs python:3.11 (~900MB)
# "slim" removes unused system packages but keeps pip working
FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# ── System dependencies ───────────────────────────────────────
# These are required by some Python packages at build time:
#   build-essential → compiles C extensions (chromadb, tokenizers)
#   libgomp1        → OpenMP runtime for sentence-transformers / numpy
# We clean up apt cache immediately to keep the layer small
RUN apt-get update && apt-get install -y \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# ── Python dependencies ───────────────────────────────────────
# Copy requirements FIRST (layer caching — reinstall only when this changes)
COPY ai-service/requirements.txt ./

# --no-cache-dir  → don't store pip's download cache in the image
# --upgrade pip   → avoid old pip bugs with modern packages
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── Copy source code ──────────────────────────────────────────
# Copied AFTER pip install so code changes don't trigger a full reinstall
COPY ai-service/main.py ./
COPY ai-service/src/ ./src/

# ── Persistent data directories ───────────────────────────────
# ChromaDB stores vectors here, uploads are temp-stored here
# Mount Docker volumes over these paths to persist data across restarts
RUN mkdir -p data/chroma_db data/uploads

# ── Security: run as non-root user ───────────────────────────
RUN useradd -m -u 1001 appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose FastAPI port
EXPOSE 8000

# ── Start FastAPI with Uvicorn ─────────────────────────────────
# --host 0.0.0.0     → listen on all interfaces (required in Docker)
# --port 8000        → matches EXPOSE above
# --workers 1        → single worker (ChromaDB is not multi-process safe)
# --no-reload        → production mode (no file watching)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

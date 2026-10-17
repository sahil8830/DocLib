"""
Ingest route — receives file content (base64) or file path from Node.js backend.
user_id is required so each chunk is tagged for per-user ChromaDB filtering.
"""
import os
import base64
import tempfile
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from src.pipeline.rag_pipeline import RAGPipeline

router = APIRouter()
pipeline = RAGPipeline()


class IngestRequest(BaseModel):
    file_path: str
    document_id: str
    filename: str
    user_id: str                        # ← required for per-user isolation
    file_content_b64: Optional[str] = None  # ← base64 file bytes (used when path not accessible)
    file_url: Optional[str] = None      # ← kept for backward compat, not used


@router.post("/")
async def ingest_document(req: IngestRequest):
    tmp_path = None
    try:
        if not os.path.exists(req.file_path) and req.file_content_b64:
            # Decode base64 content and write to temp file
            ext = os.path.splitext(req.filename)[1] or '.pdf'
            tmp_fd, tmp_path = tempfile.mkstemp(suffix=ext)
            os.close(tmp_fd)
            file_bytes = base64.b64decode(req.file_content_b64)
            with open(tmp_path, 'wb') as f:
                f.write(file_bytes)
            ingest_path = tmp_path
        else:
            ingest_path = req.file_path

        result = await pipeline.ingest_document(
            ingest_path, req.document_id, req.user_id
        )
        return result
    except ValueError as e:
        import traceback
        print(f"❌ Ingest ValueError: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        print(f"❌ Ingest Exception: {type(e).__name__}: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

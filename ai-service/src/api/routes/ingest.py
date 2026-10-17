"""
Ingest route — receives file path or file URL from Node.js backend and runs RAG ingestion.
user_id is required so each chunk is tagged for per-user ChromaDB filtering.
"""
import os
import tempfile
import httpx
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
    user_id: str                   # ← required for per-user isolation
    file_url: Optional[str] = None # ← Cloudinary/S3 URL for remote deployments


@router.post("/")
async def ingest_document(req: IngestRequest):
    tmp_path = None
    try:
        # If file_path doesn't exist locally (e.g. backend on Vercel),
        # download from file_url to a temp file
        if not os.path.exists(req.file_path) and req.file_url:
            ext = os.path.splitext(req.filename)[1] or '.pdf'
            tmp_fd, tmp_path = tempfile.mkstemp(suffix=ext)
            os.close(tmp_fd)
            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.get(req.file_url)
                response.raise_for_status()
                with open(tmp_path, 'wb') as f:
                    f.write(response.content)
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
        # Clean up temp file if we created one
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

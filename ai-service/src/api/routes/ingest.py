"""
Ingest route — receives file path from Node.js backend and runs RAG ingestion.
user_id is required so each chunk is tagged for per-user ChromaDB filtering.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from src.pipeline.rag_pipeline import RAGPipeline

router = APIRouter()
pipeline = RAGPipeline()


class IngestRequest(BaseModel):
    file_path: str
    document_id: str
    filename: str
    user_id: str                   # ← required for per-user isolation


@router.post("/")
async def ingest_document(req: IngestRequest):
    try:
        result = await pipeline.ingest_document(
            req.file_path, req.document_id, req.user_id  # ← pass user_id
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

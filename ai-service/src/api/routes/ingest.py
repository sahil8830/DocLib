"""
Ingest route — receives file path from Node.js backend and runs RAG ingestion.
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


@router.post("/")
async def ingest_document(req: IngestRequest):
    try:
        result = await pipeline.ingest_document(req.file_path, req.document_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

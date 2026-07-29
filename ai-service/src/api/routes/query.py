"""
Query route — supports both single-shot and SSE streaming queries.
"""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from src.pipeline.rag_pipeline import RAGPipeline

router = APIRouter()
pipeline = RAGPipeline()


class QueryRequest(BaseModel):
    question: str
    filters: Optional[dict] = None
    rewrite: bool = True
    stream: bool = False
    history: List[dict] = []


@router.post("/")
async def query_documents(req: QueryRequest):
    """Single-shot query."""
    try:
        result = await pipeline.query(req.question, req.filters, req.rewrite, history=req.history)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stream")
async def stream_query(req: QueryRequest):
    """SSE streaming query."""
    async def event_generator():
        async for event in pipeline.stream_query(req.question, req.filters, req.rewrite, history=req.history):
            yield event

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

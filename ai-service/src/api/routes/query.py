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


class HistoryTurn(BaseModel):
    role: str   # "user" or "model"
    content: str


class QueryRequest(BaseModel):
    question: str
    filters: Optional[dict] = None
    rewrite: bool = True
    stream: bool = False
<<<<<<< Updated upstream
    history: List[dict] = []
=======
    history: Optional[List[HistoryTurn]] = None
>>>>>>> Stashed changes


@router.post("/")
async def query_documents(req: QueryRequest):
    """Single-shot query."""
    try:
<<<<<<< Updated upstream
        result = await pipeline.query(req.question, req.filters, req.rewrite, history=req.history)
=======
        result = await pipeline.query(req.question, req.filters, req.rewrite, req.history or [])
>>>>>>> Stashed changes
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stream")
async def stream_query(req: QueryRequest):
    """SSE streaming query."""
    async def event_generator():
<<<<<<< Updated upstream
        async for event in pipeline.stream_query(req.question, req.filters, req.rewrite, history=req.history):
=======
        async for event in pipeline.stream_query(req.question, req.filters, req.rewrite, req.history or []):
>>>>>>> Stashed changes
            yield event

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

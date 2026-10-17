"""
Query route — supports both single-shot and SSE streaming queries.
user_id is passed as a ChromaDB where-filter so each user only searches their own documents.
"""
import json
from fastapi import APIRouter, HTTPException, Request
from google.genai.errors import APIError
from src.utils.gemini_errors import retry_delay_seconds
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
    history: List[dict] = []
    user_id: Optional[str] = None          # ← per-user isolation


@router.post("/")
async def query_documents(req: QueryRequest):
    """Single-shot query — scoped to user_id."""
    try:
        result = await pipeline.query(
            req.question, req.filters, req.rewrite,
            history=req.history, user_id=req.user_id  # ← pass user_id
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/stream")
async def stream_query(req: QueryRequest):
    """SSE streaming query — scoped to user_id."""
    async def event_generator():
        try:
            async for event in pipeline.stream_query(
                req.question, req.filters, req.rewrite,
                history=req.history, user_id=req.user_id
            ):
                yield event
        except APIError as error:
            if error.code == 429:
                message = (f"Gemini quota exceeded. Try again after "
                           f"{retry_delay_seconds(error)} seconds.")
            else:
                message = "Gemini could not generate an answer. Please try again."
            yield f"data: {json.dumps({'type': 'error', 'message': message})}\n\n"
        except Exception:
            yield f"data: {json.dumps({'type': 'error', 'message': 'The AI service could not complete the answer. Please try again.'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

"""
Documents management routes — list and delete documents, scoped per user.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from src.vectorstore.chroma_store import ChromaVectorStore

router = APIRouter()
store = ChromaVectorStore()


@router.get("/")
async def list_documents(user_id: Optional[str] = Query(None)):
    docs = store.list_documents(user_id=user_id)      # ← scoped to user
    return {"documents": docs, "total": len(docs)}


@router.delete("/{document_id}")
async def delete_document(document_id: str, user_id: Optional[str] = Query(None)):
    try:
        store.delete_document(document_id, user_id=user_id)  # ← scoped to user
        return {"status": "deleted", "document_id": document_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_stats(user_id: Optional[str] = Query(None)):
    docs = store.list_documents(user_id=user_id)      # ← scoped to user
    return {
        "total_chunks": store.get_collection_count(user_id=user_id),
        "total_documents": len(docs),
    }

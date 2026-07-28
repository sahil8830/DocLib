"""
Documents management routes — list and delete documents.
"""
from fastapi import APIRouter, HTTPException
from src.vectorstore.chroma_store import ChromaVectorStore

router = APIRouter()
store = ChromaVectorStore()


@router.get("/")
async def list_documents():
    docs = store.list_documents()
    return {"documents": docs, "total": len(docs)}


@router.delete("/{document_id}")
async def delete_document(document_id: str):
    try:
        store.delete_document(document_id)
        return {"status": "deleted", "document_id": document_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_stats():
    return {
        "total_chunks": store.get_collection_count(),
        "total_documents": len(store.list_documents()),
    }

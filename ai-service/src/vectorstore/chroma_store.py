"""
Vector Store — Singleton pattern wrapping ChromaDB.
Handles storing and querying document embeddings.
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import uuid
import chromadb
from chromadb.config import Settings as ChromaSettings

from src.utils.config import CHROMA_PATH, settings
from src.utils.logger import get_logger

logger = get_logger(__name__)


class BaseVectorStore(ABC):
    @abstractmethod
    def add_documents(self, texts: List[str], embeddings: List[List[float]], metadatas: List[dict], ids: List[str]) -> None:
        pass

    @abstractmethod
    def query(self, query_embedding: List[float], top_k: int, where: Optional[dict] = None) -> Dict[str, Any]:
        pass

    @abstractmethod
    def delete_document(self, document_id: str) -> None:
        pass

    @abstractmethod
    def list_documents(self) -> List[Dict]:
        pass


class ChromaVectorStore(BaseVectorStore):
    """Singleton ChromaDB persistent store."""
    _instance: Optional["ChromaVectorStore"] = None
    _client: Optional[chromadb.PersistentClient] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._init_client()
        return cls._instance

    def _init_client(self):
        self._client = chromadb.PersistentClient(
            path=CHROMA_PATH,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self._collection = self._client.get_or_create_collection(
            name="contexa_documents",
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("chromadb_initialized", path=CHROMA_PATH)

    def add_documents(
        self,
        texts: List[str],
        embeddings: List[List[float]],
        metadatas: List[dict],
        ids: List[str],
    ) -> None:
        self._collection.add(
            documents=texts,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids,
        )
        logger.info("documents_added", count=len(texts))

    def query(
        self,
        query_embedding: List[float],
        top_k: int = 6,
        where: Optional[dict] = None,
    ) -> Dict[str, Any]:
        kwargs = dict(
            query_embeddings=[query_embedding],
            n_results=min(top_k, self._collection.count() or 1),
            include=["documents", "metadatas", "distances"],
        )
        if where:
            kwargs["where"] = where
        results = self._collection.query(**kwargs)
        return results

    def delete_document(self, document_id: str) -> None:
        """Delete all chunks belonging to a document by its source path."""
        results = self._collection.get(where={"document_id": document_id})
        if results["ids"]:
            self._collection.delete(ids=results["ids"])
            logger.info("document_deleted", document_id=document_id, chunks_removed=len(results["ids"]))

    def list_documents(self) -> List[Dict]:
        """Return unique document metadata entries."""
        results = self._collection.get(include=["metadatas"])
        seen = {}
        for meta in results["metadatas"]:
            doc_id = meta.get("document_id", "")
            if doc_id and doc_id not in seen:
                seen[doc_id] = meta
        return list(seen.values())

    def get_collection_count(self) -> int:
        return self._collection.count()

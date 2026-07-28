"""
Hybrid Retriever — Strategy + Decorator patterns.
Combines ChromaDB vector search with BM25 keyword search using
Reciprocal Rank Fusion (RRF) for superior recall.
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from rank_bm25 import BM25Okapi

from src.vectorstore.chroma_store import ChromaVectorStore
from src.embeddings.embedding_service import BaseEmbeddingService
from src.utils.config import settings
from src.utils.logger import get_logger

logger = get_logger(__name__)


class BaseRetriever(ABC):
    @abstractmethod
    def retrieve(self, query: str, top_k: int, filters: Optional[dict] = None) -> List[Dict]:
        pass


class VectorRetriever(BaseRetriever):
    def __init__(self, vector_store: ChromaVectorStore, embedding_service: BaseEmbeddingService):
        self.vector_store = vector_store
        self.embedding_service = embedding_service

    def retrieve(self, query: str, top_k: int, filters: Optional[dict] = None) -> List[Dict]:
        query_embedding = self.embedding_service.embed_query(query)
        results = self.vector_store.query(query_embedding, top_k=top_k, where=filters)
        chunks = []
        for i, doc in enumerate(results["documents"][0]):
            score = 1.0 - results["distances"][0][i]  # cosine distance -> similarity
            chunks.append({
                "content": doc,
                "metadata": results["metadatas"][0][i],
                "score": round(score, 4),
                "rank": i + 1,
            })
        return chunks


class HybridRetriever(BaseRetriever):
    """Combines vector search + BM25, merges via Reciprocal Rank Fusion."""

    def __init__(
        self,
        vector_store: ChromaVectorStore,
        embedding_service: BaseEmbeddingService,
        bm25_weight: float = 0.3,
        vector_weight: float = 0.7,
    ):
        self.vector_store = vector_store
        self.embedding_service = embedding_service
        self.bm25_weight = bm25_weight
        self.vector_weight = vector_weight

    def _rrf_score(self, rank: int, k: int = 60) -> float:
        return 1.0 / (k + rank)

    def retrieve(self, query: str, top_k: int, filters: Optional[dict] = None) -> List[Dict]:
        # --- Vector search ---
        query_embedding = self.embedding_service.embed_query(query)
        vector_results = self.vector_store.query(query_embedding, top_k=top_k * 2, where=filters)
        vector_docs = vector_results["documents"][0]
        vector_metas = vector_results["metadatas"][0]

        # --- BM25 search ---
        all_docs = self.vector_store._collection.get(include=["documents", "metadatas"])
        corpus = all_docs["documents"]
        corpus_metas = all_docs["metadatas"]
        tokenized_corpus = [doc.lower().split() for doc in corpus]

        bm25 = BM25Okapi(tokenized_corpus)
        bm25_scores = bm25.get_scores(query.lower().split())
        top_bm25_indices = sorted(range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True)[: top_k * 2]

        # --- RRF merge ---
        rrf_scores: Dict[str, float] = {}
        doc_map: Dict[str, Dict] = {}

        for rank, (doc, meta) in enumerate(zip(vector_docs, vector_metas)):
            key = doc[:100]  # use first 100 chars as dedup key
            rrf_scores[key] = rrf_scores.get(key, 0) + self.vector_weight * self._rrf_score(rank + 1)
            doc_map[key] = {"content": doc, "metadata": meta}

        for rank, idx in enumerate(top_bm25_indices):
            doc = corpus[idx]
            meta = corpus_metas[idx]
            key = doc[:100]
            rrf_scores[key] = rrf_scores.get(key, 0) + self.bm25_weight * self._rrf_score(rank + 1)
            if key not in doc_map:
                doc_map[key] = {"content": doc, "metadata": meta}

        sorted_keys = sorted(rrf_scores, key=lambda k: rrf_scores[k], reverse=True)[:top_k]
        results = []
        threshold = settings.get("retrieval", {}).get("similarity_threshold", 0.65)

        for rank, key in enumerate(sorted_keys):
            score = round(rrf_scores[key], 4)
            if score >= threshold * self._rrf_score(1):  # scaled threshold
                results.append({
                    "content": doc_map[key]["content"],
                    "metadata": doc_map[key]["metadata"],
                    "score": score,
                    "rank": rank + 1,
                })

        logger.info("hybrid_retrieval_done", query_len=len(query), results=len(results))
        return results


class RetrieverFactory:
    @staticmethod
    def get_retriever(
        vector_store: ChromaVectorStore,
        embedding_service: BaseEmbeddingService,
        hybrid: bool = True,
    ) -> BaseRetriever:
        retrieval_cfg = settings.get("retrieval", {})
        if hybrid and retrieval_cfg.get("hybrid_search", True):
            return HybridRetriever(
                vector_store=vector_store,
                embedding_service=embedding_service,
                bm25_weight=retrieval_cfg.get("bm25_weight", 0.3),
                vector_weight=retrieval_cfg.get("vector_weight", 0.7),
            )
        return VectorRetriever(vector_store=vector_store, embedding_service=embedding_service)

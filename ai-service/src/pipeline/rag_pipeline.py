"""
RAG Pipeline Orchestrator — Builder pattern.
Chains all components: Load → Chunk → Embed → Store → Retrieve → Generate
"""
import uuid
from pathlib import Path
from typing import List, Dict, AsyncGenerator, Optional

from src.loaders.document_loader import LoaderFactory, Document
from src.chunkers.chunker import ChunkerFactory
from src.embeddings.embedding_service import EmbeddingServiceFactory
from src.vectorstore.chroma_store import ChromaVectorStore
from src.retrievers.hybrid_retriever import RetrieverFactory, HybridRetriever
from src.llm.llm_service import LLMServiceFactory
from src.utils.config import settings
from src.utils.logger import get_logger

logger = get_logger(__name__)


class RAGPipeline:
    """
    Builder-pattern orchestrator. All sub-services are injected for testability.
    """

    def __init__(self):
        cfg = settings
        chunk_cfg = cfg.get("chunking", {})
        llm_cfg = cfg.get("llm", {})
        embed_cfg = cfg.get("embeddings", {})
        retrieval_cfg = cfg.get("retrieval", {})

        self.chunker = ChunkerFactory.get_chunker(
            strategy=chunk_cfg.get("strategy", "fixed_size"),
            chunk_size=chunk_cfg.get("chunk_size", 512),
            chunk_overlap=chunk_cfg.get("chunk_overlap", 64),
            min_chunk_size=chunk_cfg.get("min_chunk_size", 100),
        )
        self.embedding_service = EmbeddingServiceFactory.get_service(
            embed_cfg.get("provider", "gemini")
        )
        self.vector_store = ChromaVectorStore()  # Singleton
        self.retriever = RetrieverFactory.get_retriever(
            vector_store=self.vector_store,
            embedding_service=self.embedding_service,
            hybrid=retrieval_cfg.get("hybrid_search", True),
        )
        self.llm_service = LLMServiceFactory.get_service(llm_cfg.get("provider", "gemini"))
        self.top_k = retrieval_cfg.get("top_k", 6)

    # ─────────────────────────────────────────────
    #  INGESTION
    # ─────────────────────────────────────────────
    async def ingest_document(self, file_path: str, document_id: str) -> Dict:
        """Full ingestion pipeline for a single document."""
        logger.info("ingestion_started", file=file_path, doc_id=document_id)

        loader = LoaderFactory.get_loader(file_path)
        raw_docs = loader.load(file_path)

        if not raw_docs:
            raise ValueError(f"No content extracted from {file_path}")

        # Tag each doc with document_id for future deletion
        for doc in raw_docs:
            doc.metadata["document_id"] = document_id

        chunks = self.chunker.chunk(raw_docs)
        texts = [c.content for c in chunks]
        metadatas = [c.metadata for c in chunks]
        ids = [f"{document_id}_chunk_{i}" for i in range(len(chunks))]

        embeddings = self.embedding_service.embed_texts(texts)
        self.vector_store.add_documents(texts, embeddings, metadatas, ids)

        # Invalidate BM25 cache so the next query uses the updated corpus
        if isinstance(self.retriever, HybridRetriever):
            self.retriever.invalidate_bm25_cache()

        logger.info("ingestion_complete", doc_id=document_id, chunks=len(chunks))
        return {
            "document_id": document_id,
            "chunks_created": len(chunks),
            "status": "success",
        }

    # ─────────────────────────────────────────────
    #  QUERY
    # ─────────────────────────────────────────────
<<<<<<< Updated upstream
    async def query(self, question: str, filters: Optional[dict] = None, rewrite: bool = False, history: Optional[list] = None) -> Dict:
=======
    async def query(self, question: str, filters: Optional[dict] = None, rewrite: bool = False, history: Optional[List[Dict]] = None) -> Dict:
>>>>>>> Stashed changes
        """Single-shot query, returns full answer."""
        if rewrite:
            question = await self.llm_service.rewrite_query(question)

        chunks = self.retriever.retrieve(question, top_k=self.top_k, filters=filters)
<<<<<<< Updated upstream
        answer = await self.llm_service.generate(question, chunks, history=history)
=======
        answer = await self.llm_service.generate(question, chunks, history or [])
>>>>>>> Stashed changes

        return {
            "answer": answer,
            "sources": chunks,
            "rewritten_query": question,
            "chunk_count": len(chunks),
        }

    async def stream_query(
<<<<<<< Updated upstream
        self, question: str, filters: Optional[dict] = None, rewrite: bool = False, history: Optional[list] = None
=======
        self, question: str, filters: Optional[dict] = None, rewrite: bool = False, history: Optional[List[Dict]] = None
>>>>>>> Stashed changes
    ) -> AsyncGenerator[str, None]:
        """Streaming query — yields text tokens as they arrive."""
        if rewrite:
            question = await self.llm_service.rewrite_query(question)

        chunks = self.retriever.retrieve(question, top_k=self.top_k, filters=filters)

        # First yield: send sources as a JSON metadata event
        import json
        sources_event = json.dumps({
            "type": "sources",
            "sources": [
                {
                    "content": c["content"][:200],
                    "metadata": c["metadata"],
                    "score": c["score"],
                }
                for c in chunks
            ],
            "rewritten_query": question,
        })
        yield f"data: {sources_event}\n\n"

        # Stream answer tokens
<<<<<<< Updated upstream
        async for token in self.llm_service.stream_generate(question, chunks, history=history):
=======
        async for token in self.llm_service.stream_generate(question, chunks, history or []):
>>>>>>> Stashed changes
            token_event = json.dumps({"type": "token", "text": token})
            yield f"data: {token_event}\n\n"

        yield "data: {\"type\": \"done\"}\n\n"

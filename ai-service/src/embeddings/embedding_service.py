"""
Embedding Service — Factory pattern.
Generates vector embeddings for text chunks via Gemini API.
Includes retry logic with exponential backoff.
"""
from abc import ABC, abstractmethod
from typing import List
import time
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

import google.generativeai as genai
from src.utils.config import GEMINI_API_KEY, settings
from src.utils.logger import get_logger

logger = get_logger(__name__)

genai.configure(api_key=GEMINI_API_KEY)


class BaseEmbeddingService(ABC):
    @abstractmethod
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        pass

    @abstractmethod
    def embed_query(self, query: str) -> List[float]:
        pass


class GeminiEmbeddingService(BaseEmbeddingService):
    """Gemini text-embedding-004 — 768-dimension embeddings."""

    def __init__(self):
        self.model = settings.get("embeddings", {}).get("model", "models/text-embedding-004")
        self.batch_size = settings.get("embeddings", {}).get("batch_size", 100)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(Exception),
    )
    def _embed_batch(self, texts: List[str], task_type: str = "RETRIEVAL_DOCUMENT") -> List[List[float]]:
        result = genai.embed_content(
            model=self.model,
            content=texts,
            task_type=task_type,
        )
        return result["embedding"] if len(texts) == 1 else [e for e in result["embedding"]]

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        all_embeddings = []
        for i in range(0, len(texts), self.batch_size):
            batch = texts[i: i + self.batch_size]
            embeddings = self._embed_batch(batch, task_type="RETRIEVAL_DOCUMENT")
            if isinstance(embeddings[0], float):
                embeddings = [embeddings]  # single text returns flat list
            all_embeddings.extend(embeddings)
            logger.info("batch_embedded", batch_num=i // self.batch_size + 1, size=len(batch))
        return all_embeddings

    def embed_query(self, query: str) -> List[float]:
        result = self._embed_batch([query], task_type="RETRIEVAL_QUERY")
        if isinstance(result[0], float):
            return result
        return result[0]


class EmbeddingServiceFactory:
    @staticmethod
    def get_service(provider: str = "gemini") -> BaseEmbeddingService:
        if provider == "gemini":
            return GeminiEmbeddingService()
        raise ValueError(f"Unknown embedding provider: {provider}")

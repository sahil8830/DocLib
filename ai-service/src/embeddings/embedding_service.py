"""
Embedding Service — Factory pattern.
Generates vector embeddings for text chunks via Gemini API.
Includes retry logic with exponential backoff.
"""
from abc import ABC, abstractmethod
from typing import List
import time
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from google import genai
from google.genai import types as genai_types
from src.utils.config import GEMINI_API_KEY, settings
from src.utils.logger import get_logger

logger = get_logger(__name__)

_client = genai.Client(api_key=GEMINI_API_KEY)


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
        result = _client.models.embed_content(
            model=self.model,
            contents=texts,
            config=genai_types.EmbedContentConfig(task_type=task_type),
        )
        return [e.values for e in result.embeddings]

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        all_embeddings = []
        for i in range(0, len(texts), self.batch_size):
            batch = texts[i: i + self.batch_size]
            embeddings = self._embed_batch(batch, task_type="RETRIEVAL_DOCUMENT")
            all_embeddings.extend(embeddings)
            logger.info("batch_embedded", batch_num=i // self.batch_size + 1, size=len(batch))
        return all_embeddings

    def embed_query(self, query: str) -> List[float]:
        result = self._embed_batch([query], task_type="RETRIEVAL_QUERY")
        return result[0]


class EmbeddingServiceFactory:
    @staticmethod
    def get_service(provider: str = "gemini") -> BaseEmbeddingService:
        if provider == "gemini":
            return GeminiEmbeddingService()
        raise ValueError(f"Unknown embedding provider: {provider}")

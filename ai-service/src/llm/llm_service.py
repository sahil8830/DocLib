"""
LLM Service — Gemini answer generation with streaming support.
Includes query rewriting and source-cited response formatting.
"""
from abc import ABC, abstractmethod
from typing import List, Dict, AsyncGenerator

from google import genai
from google.genai import types as genai_types
from src.utils.config import GEMINI_API_KEY, settings
from src.utils.logger import get_logger

logger = get_logger(__name__)

_client = genai.Client(api_key=GEMINI_API_KEY)

SYSTEM_PROMPT = """You are Contexa, an expert document assistant. Answer the user's question ONLY using the provided document context.

Rules:
1. Always ground your answer in the provided context.
2. After your answer, list the specific source(s) you used as citations.
3. If the context doesn't contain enough information, clearly say so — do NOT hallucinate.
4. Be concise, accurate, and professional.
5. Format your response clearly using markdown where helpful.

Context:
{context}

Question: {question}

Respond with:
**Answer:** [your answer here]

**Sources:**
[list each source chunk used, e.g. "- [filename, page X]: relevant quote"]
"""

REWRITE_PROMPT = """Rewrite the following user question to improve document retrieval.
Make it more specific and self-contained. Return ONLY the rewritten question, nothing else.

Original question: {question}
Rewritten question:"""


class BaseLLMService(ABC):
    @abstractmethod
    async def generate(self, question: str, context_chunks: List[Dict]) -> str:
        pass

    @abstractmethod
    async def stream_generate(self, question: str, context_chunks: List[Dict]) -> AsyncGenerator[str, None]:
        pass

    @abstractmethod
    async def rewrite_query(self, question: str) -> str:
        pass


class GeminiLLMService(BaseLLMService):
    def __init__(self):
        llm_cfg = settings.get("llm", {})
        self.model_name = llm_cfg.get("model", "gemini-2.5-flash")
        self.temperature = llm_cfg.get("temperature", 0.2)
        self.max_tokens = llm_cfg.get("max_tokens", 2048)
        self._gen_config = genai_types.GenerateContentConfig(
            temperature=self.temperature,
            max_output_tokens=self.max_tokens,
        )

    def _build_context(self, chunks: List[Dict]) -> str:
        parts = []
        for i, chunk in enumerate(chunks):
            source = chunk["metadata"].get("source", "Unknown")
            page = chunk["metadata"].get("page", "")
            page_str = f", page {page}" if page else ""
            parts.append(f"[Chunk {i+1} — {source}{page_str}]\n{chunk['content']}")
        return "\n\n---\n\n".join(parts)

    async def generate(self, question: str, context_chunks: List[Dict]) -> str:
        if not context_chunks:
            return "I couldn't find relevant information in the uploaded documents to answer your question."
        context = self._build_context(context_chunks)
        prompt = SYSTEM_PROMPT.format(context=context, question=question)
        response = await _client.aio.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=self._gen_config,
        )
        return response.text

    async def stream_generate(self, question: str, context_chunks: List[Dict]) -> AsyncGenerator[str, None]:
        if not context_chunks:
            yield "I couldn't find relevant information in the uploaded documents to answer your question."
            return
        context = self._build_context(context_chunks)
        prompt = SYSTEM_PROMPT.format(context=context, question=question)
        async for chunk in await _client.aio.models.generate_content_stream(
            model=self.model_name,
            contents=prompt,
            config=self._gen_config,
        ):
            if chunk.text:
                yield chunk.text

    async def rewrite_query(self, question: str) -> str:
        prompt = REWRITE_PROMPT.format(question=question)
        response = await _client.aio.models.generate_content(
            model=self.model_name,
            contents=prompt,
            config=self._gen_config,
        )
        rewritten = response.text.strip()
        logger.info("query_rewritten", original=question, rewritten=rewritten)
        return rewritten


class LLMServiceFactory:
    @staticmethod
    def get_service(provider: str = "gemini") -> BaseLLMService:
        if provider == "gemini":
            return GeminiLLMService()
        raise ValueError(f"Unknown LLM provider: {provider}")

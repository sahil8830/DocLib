"""
Chunkers — Strategy pattern.
Each strategy splits documents into chunks differently.
"""
from abc import ABC, abstractmethod
from typing import List
from src.loaders.document_loader import Document
from src.utils.logger import get_logger

logger = get_logger(__name__)


class BaseChunker(ABC):
    @abstractmethod
    def chunk(self, documents: List[Document]) -> List[Document]:
        pass


class FixedSizeChunker(BaseChunker):
    """Splits text into fixed-size overlapping chunks."""

    def __init__(self, chunk_size: int = 512, chunk_overlap: int = 64, min_chunk_size: int = 100):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.min_chunk_size = min_chunk_size

    def chunk(self, documents: List[Document]) -> List[Document]:
        chunks = []
        for doc in documents:
            text = doc.content
            start = 0
            chunk_index = 0
            while start < len(text):
                end = start + self.chunk_size
                chunk_text = text[start:end].strip()
                if len(chunk_text) >= self.min_chunk_size:
                    chunks.append(Document(
                        content=chunk_text,
                        metadata={**doc.metadata, "chunk_index": chunk_index, "chunk_start": start}
                    ))
                    chunk_index += 1
                start += self.chunk_size - self.chunk_overlap
        logger.info("fixed_chunking_done", input_docs=len(documents), output_chunks=len(chunks))
        return chunks


class SemanticChunker(BaseChunker):
    """Splits text at sentence/paragraph boundaries for more natural chunks."""

    def __init__(self, max_chunk_size: int = 600, min_chunk_size: int = 100):
        self.max_chunk_size = max_chunk_size
        self.min_chunk_size = min_chunk_size

    def _split_sentences(self, text: str) -> List[str]:
        import re
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if s.strip()]

    def chunk(self, documents: List[Document]) -> List[Document]:
        chunks = []
        for doc in documents:
            sentences = self._split_sentences(doc.content)
            current_chunk = ""
            chunk_index = 0
            for sentence in sentences:
                if len(current_chunk) + len(sentence) <= self.max_chunk_size:
                    current_chunk += " " + sentence
                else:
                    if len(current_chunk.strip()) >= self.min_chunk_size:
                        chunks.append(Document(
                            content=current_chunk.strip(),
                            metadata={**doc.metadata, "chunk_index": chunk_index}
                        ))
                        chunk_index += 1
                    current_chunk = sentence
            if len(current_chunk.strip()) >= self.min_chunk_size:
                chunks.append(Document(
                    content=current_chunk.strip(),
                    metadata={**doc.metadata, "chunk_index": chunk_index}
                ))
        logger.info("semantic_chunking_done", input_docs=len(documents), output_chunks=len(chunks))
        return chunks


class ChunkerFactory:
    """Factory — returns the correct chunker from settings."""
    @staticmethod
    def get_chunker(strategy: str, **kwargs) -> BaseChunker:
        if strategy == "fixed_size":
            return FixedSizeChunker(**kwargs)
        elif strategy == "semantic":
            return SemanticChunker(**kwargs)
        raise ValueError(f"Unknown chunking strategy: {strategy}")

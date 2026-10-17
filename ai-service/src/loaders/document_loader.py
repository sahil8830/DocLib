"""
Document Loaders — Adapter pattern.
Each loader normalizes a different file format into a common Document schema.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import List
import io

from src.utils.logger import get_logger

logger = get_logger(__name__)


@dataclass
class Document:
    """Common document schema across all loaders."""
    content: str
    metadata: dict = field(default_factory=dict)


class BaseLoader(ABC):
    @abstractmethod
    def load(self, file_path: str) -> List[Document]:
        pass


class PDFLoader(BaseLoader):
    def load(self, file_path: str) -> List[Document]:
        from pypdf import PdfReader
        reader = PdfReader(file_path)
        docs = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            if text.strip():
                docs.append(Document(
                    content=text,
                    metadata={"source": file_path, "page": i + 1, "type": "pdf"}
                ))
        logger.info("pdf_loaded", path=file_path, pages=len(docs))
        return docs


class DOCXLoader(BaseLoader):
    def load(self, file_path: str) -> List[Document]:
        try:
            from docx import Document as DocxDocument
            doc = DocxDocument(file_path)
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            content = "\n".join(paragraphs)
            logger.info("docx_loaded", path=file_path, paragraphs=len(paragraphs))
            return [Document(content=content, metadata={"source": file_path, "type": "docx"})]
        except (KeyError, Exception) as e:
            # Fallback: extract raw text from the ZIP archive directly
            logger.warning("docx_fallback", path=file_path, error=str(e))
            return self._load_raw_xml(file_path)

    def _load_raw_xml(self, file_path: str) -> List[Document]:
        """Fallback: read word/document.xml directly from the DOCX ZIP."""
        import zipfile
        import re
        try:
            with zipfile.ZipFile(file_path, 'r') as z:
                names = z.namelist()
                # Try document.xml first, then any XML in word/
                target = 'word/document.xml' if 'word/document.xml' in names else next(
                    (n for n in names if n.startswith('word/') and n.endswith('.xml')), None
                )
                if not target:
                    raise ValueError("No readable content found in DOCX")
                xml_content = z.read(target).decode('utf-8', errors='ignore')
                # Strip XML tags to get plain text
                text = re.sub(r'<[^>]+>', ' ', xml_content)
                text = re.sub(r'\s+', ' ', text).strip()
                logger.info("docx_raw_xml_loaded", path=file_path, chars=len(text))
                return [Document(content=text, metadata={"source": file_path, "type": "docx"})]
        except Exception as e2:
            raise ValueError(f"Could not extract text from DOCX: {e2}")


class TXTLoader(BaseLoader):
    def load(self, file_path: str) -> List[Document]:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        logger.info("txt_loaded", path=file_path, chars=len(content))
        return [Document(content=content, metadata={"source": file_path, "type": "txt"})]


class LoaderFactory:
    """Factory pattern — returns correct loader based on file extension."""
    _loaders = {
        ".pdf": PDFLoader,
        ".docx": DOCXLoader,
        ".txt": TXTLoader,
        ".md": TXTLoader,
    }

    @classmethod
    def get_loader(cls, file_path: str) -> BaseLoader:
        ext = Path(file_path).suffix.lower()
        loader_cls = cls._loaders.get(ext)
        if not loader_cls:
            raise ValueError(f"Unsupported file type: {ext}")
        return loader_cls()

    @classmethod
    def supported_extensions(cls) -> list:
        return list(cls._loaders.keys())

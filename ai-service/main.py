"""
Contexa AI Microservice — Entry Point
Internal FastAPI service consumed by the Node.js Express gateway.
"""
import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import ingest, query, documents, health, settings as settings_route
from src.utils.config import settings
from src.utils.logger import get_logger

logger = get_logger(__name__)

app = FastAPI(
    title="Contexa AI Microservice",
    description="Internal RAG pipeline service",
    version="1.0.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],  # Only allow Node.js backend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(ingest.router, prefix="/ingest", tags=["ingest"])
app.include_router(query.router, prefix="/query", tags=["query"])
app.include_router(documents.router, prefix="/documents", tags=["documents"])
app.include_router(settings_route.router, prefix="/settings", tags=["settings"])


@app.on_event("startup")
async def startup_event():
    logger.info("Contexa AI Microservice starting up...")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8000")),
        reload=settings.get("dev_mode", False),
        log_level="info",
    )

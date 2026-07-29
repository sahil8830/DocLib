"""
Settings reload route — hot-reloads config and rebuilds pipeline components.
"""
from fastapi import APIRouter
from src.utils.config import reload_settings
from src.utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/reload")
async def reload_pipeline_settings():
    """
    Reload settings.yaml and rebuild the pipeline components that depend on it.
    Called by the Node.js gateway after the user saves settings from the UI.
    """
    from src.api.routes import query as query_module  # avoid circular at import time

    try:
        new_settings = reload_settings()
        logger.info("settings_reloaded", sections=list(new_settings.keys()))

        # Rebuild the shared RAGPipeline instance with the new config
        from src.pipeline.rag_pipeline import RAGPipeline
        query_module.pipeline = RAGPipeline()
        logger.info("pipeline_rebuilt_after_settings_reload")

        return {"status": "ok", "message": "Settings reloaded and pipeline rebuilt"}
    except Exception as e:
        logger.error("settings_reload_failed", error=str(e))
        return {"status": "error", "message": str(e)}

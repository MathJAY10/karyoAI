from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List
from app.services.memory_extractor import memory_extractor
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class ExtractMemoryRequest(BaseModel):
    sessionId: int
    userId: int
    conversationContext: str

class EmbedMemoryRequest(BaseModel):
    memoryFactId: int
    userId: int
    sessionId: int
    content: str

@router.post("/extract")
async def extract_memory(request: ExtractMemoryRequest):
    """Extract atomic facts from an idle conversation and return novel ones."""
    try:
        result = await memory_extractor.process_session(
            session_id=request.sessionId,
            user_id=request.userId,
            conversation_context=request.conversationContext
        )
        return result
    except Exception as e:
        logger.error(f"Failed to process memory extraction: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Extraction failed: {str(e)}"
        )

@router.post("/embed")
async def embed_memory(request: EmbedMemoryRequest):
    """Store the embedding in ChromaDB after Postgres insertion."""
    try:
        success = await memory_extractor.store_embedding(
            memory_fact_id=request.memoryFactId,
            user_id=request.userId,
            session_id=request.sessionId,
            content=request.content
        )
        if not success:
            raise Exception("Failed to store embedding in ChromaDB")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Failed to embed memory: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Embedding failed: {str(e)}"
        )

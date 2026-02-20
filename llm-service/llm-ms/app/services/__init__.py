"""
Services module - Core business logic
Exports singleton instances of services for application use
"""

from app.services.rag_service import rag_service
from app.services.ingestion_service import ingestion_service
from app.services.query_service import query_service
from app.services.embedding_service import embedding_service
from app.services.chroma_service import chroma_service
from app.services.ollama_service import ollama_service

__all__ = [
    "rag_service",           # Facade for RAG pipeline
    "ingestion_service",     # Document ingestion and chunking
    "query_service",         # Context retrieval and answer generation
    "embedding_service",     # Shared embedding service
    "chroma_service",        # Shared vector storage service
    "ollama_service",        # Shared LLM service
]

"""
RAG API Routes
Defines endpoints for document ingestion, retrieval, and RAG queries
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from app.services.rag_service import rag_service
from app.services.embedding_service import embedding_service
from app.services.chroma_service import chroma_service
import os

# Create router
router = APIRouter()


# Request/Response Models
class IngestDocumentRequest(BaseModel):
    """Request to ingest a document"""
    document_id: str
    document_text: str
    metadata: Optional[dict] = None
    collection_name: str = "documents"


class IngestDocumentResponse(BaseModel):
    """Response from document ingestion"""
    status: str
    document_id: str
    chunk_count: int
    collection_id: str


class RetrieveContextRequest(BaseModel):
    """Request to retrieve context"""
    query: str
    collection_name: str = "documents"
    n_results: int = 5


class RetrieveContextResponse(BaseModel):
    """Response from context retrieval"""
    chunks: List[dict]
    source_count: int


class RAGQueryRequest(BaseModel):
    """Request for RAG query"""
    query: str
    collection_name: str = "documents"
    n_context_chunks: int = 5
    temperature: float = 0.7
    max_tokens: int = 512


class RAGQueryResponse(BaseModel):
    """Response from RAG query"""
    answer: str
    context: List[dict]
    source_count: int
    model: str


# Endpoints
@router.post("/ingest", response_model=IngestDocumentResponse)
async def ingest_document(request: IngestDocumentRequest):
    """
    Ingest a document for RAG
    
    Chunks the document, generates embeddings, and stores in ChromaDB
    
    Args:
        document_id: Unique identifier for the document
        document_text: Full text of the document
        metadata: Optional metadata (file_name, source, etc.)
        collection_name: Name of the collection to store in
        
    Returns:
        Ingestion status with chunk count
    """
    try:
        result = await rag_service.ingest_document(
            document_id=request.document_id,
            document_text=request.document_text,
            metadata=request.metadata,
            collection_name=request.collection_name
        )
        return IngestDocumentResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Document ingestion failed: {str(e)}"
        )


@router.post("/retrieve")
async def retrieve_context(request: RetrieveContextRequest) -> RetrieveContextResponse:
    """
    Retrieve relevant document chunks for a query
    
    Finds the most relevant chunks from the knowledge base based on semantic similarity
    
    Args:
        query: Question or search query
        collection_name: Name of the collection to search
        n_results: Number of chunks to retrieve
        
    Returns:
        List of relevant chunks with similarity scores
    """
    try:
        chunks = await rag_service.retrieve_context(
            query=request.query,
            collection_name=request.collection_name,
            n_results=request.n_results
        )
        return RetrieveContextResponse(chunks=chunks, source_count=len(chunks))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Context retrieval failed: {str(e)}"
        )


@router.post("/query")
async def rag_query(request: RAGQueryRequest) -> RAGQueryResponse:
    """
    Perform full RAG pipeline: retrieve context and generate answer
    
    Retrieves relevant documents and uses them to generate a contextual answer
    
    Args:
        query: User question
        collection_name: Name of the collection
        n_context_chunks: Number of chunks to use for context
        temperature: LLM creativity (0-2)
        max_tokens: Max response length
        
    Returns:
        Generated answer with source chunks
    """
    try:
        result = await rag_service.rag_query(
            query=request.query,
            collection_name=request.collection_name,
            n_context_chunks=request.n_context_chunks,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        return RAGQueryResponse(**result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG query failed: {str(e)}"
        )


@router.get("/collections")
async def list_collections() -> dict:
    """Get list of all available collections"""
    try:
        collections = chroma_service.list_collections()
        return {
            "collections": collections,
            "count": len(collections)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list collections: {str(e)}"
        )


@router.get("/collection/{collection_name}/stats")
async def get_collection_stats(collection_name: str) -> dict:
    """Get statistics about a collection"""
    try:
        stats = chroma_service.get_collection_stats(collection_name)
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get collection stats: {str(e)}"
        )


@router.post("/embedding")
async def generate_embedding(request: dict) -> dict:
    """
    Generate embedding for a text
    
    Useful for debugging and testing embedding quality
    
    Args:
        text: Text to embed
        
    Returns:
        Embedding vector
    """
    try:
        text = request.get("text")
        if not text:
            raise ValueError("Text is required")
        
        embedding = await embedding_service.generate_embedding(text)
        return {
            "text": text,
            "embedding_dimension": len(embedding),
            "embedding": embedding[:50]  # Return only first 50 dimensions for readability
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Embedding generation failed: {str(e)}"
        )


@router.get("/rag/health")
async def rag_health_check() -> dict:
    """
    Check health of RAG system components
    
    Returns status of ChromaDB and embedding model
    """
    try:
        chroma_healthy = await chroma_service.check_health()
        embedding_model_available = await embedding_service.check_embedding_model_available()
        
        return {
            "status": "healthy" if (chroma_healthy and embedding_model_available) else "degraded",
            "chromadb": "running" if chroma_healthy else "not running",
            "embedding_model": f"{embedding_service.EMBEDDING_MODEL} available" if embedding_model_available else "not available",
            "chunk_size": embedding_service.CHUNK_SIZE,
            "chunk_overlap": embedding_service.CHUNK_OVERLAP
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Health check failed: {str(e)}"
        )

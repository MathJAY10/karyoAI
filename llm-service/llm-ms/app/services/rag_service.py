"""
RAG Service - Unified RAG facade combining Ingestion and Query services
Note: This file now delegates to separate ingestion_service and query_service
for better separation of concerns and independent scaling
"""

from typing import List, Dict, Optional
from app.services.ingestion_service import ingestion_service
from app.services.query_service import query_service


class RAGService:
    """
    Facade for RAG pipeline combining ingestion and query services
    
    Architecture:
    - IngestionService: Document chunking, embedding, and vector storage
    - QueryService: Semantic search and LLM-augmented answer generation
    
    This unified interface maintains backward compatibility while allowing
    independent service scaling and maintenance
    """

    @staticmethod
    async def ingest_document(
        document_id: str,
        document_text: str,
        metadata: Optional[Dict] = None,
        collection_name: str = "documents"
    ) -> Dict:
        """
        Ingest a document via IngestionService
        
        Args:
            document_id: Unique document identifier
            document_text: Full text of the document
            metadata: Optional metadata
            collection_name: ChromaDB collection name
            
        Returns:
            Ingestion status and chunk count
        """
        return await ingestion_service.ingest_document(
            document_id=document_id,
            document_text=document_text,
            metadata=metadata,
            collection_name=collection_name
        )

    @staticmethod
    async def retrieve_context(
        query: str,
        collection_name: str = "documents",
        n_results: int = 5,
        query_embedding: Optional[List[float]] = None
    ) -> List[Dict]:
        """
        Retrieve relevant context via QueryService
        
        Args:
            query: User query
            collection_name: ChromaDB collection name
            n_results: Number of top-k chunks
            query_embedding: Optional pre-computed embedding
            
        Returns:
            List of relevant chunks with similarity scores
        """
        return await query_service.retrieve_context(
            query=query,
            collection_name=collection_name,
            n_results=n_results,
            query_embedding=query_embedding
        )

    @staticmethod
    async def rag_query(
        query: str,
        collection_name: str = "documents",
        n_context_chunks: int = 5,
        temperature: float = 0.7,
        max_tokens: int = 512
    ) -> Dict:
        """
        Execute full RAG pipeline via QueryService
        
        Args:
            query: User question
            collection_name: ChromaDB collection name
            n_context_chunks: Number of context chunks
            temperature: LLM temperature
            max_tokens: Max response length
            
        Returns:
            Generated answer with sources
        """
        return await query_service.rag_query(
            query=query,
            collection_name=collection_name,
            n_context_chunks=n_context_chunks,
            temperature=temperature,
            max_tokens=max_tokens
        )

    @staticmethod
    def delete_document(
        document_id: str,
        collection_name: str = "documents"
    ) -> Dict:
        """
        Delete a document via IngestionService
        
        Args:
            document_id: Document to delete
            collection_name: ChromaDB collection name
            
        Returns:
            Deletion status
        """
        return ingestion_service.delete_document(
            document_id=document_id,
            collection_name=collection_name
        )


# Create singleton instance
rag_service = RAGService()

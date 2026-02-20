"""
Ingestion Service - Document ingestion and vector embedding pipeline
Handles document chunking, embedding generation, and vector storage
"""

from typing import Dict, Optional
from app.services.embedding_service import embedding_service, EmbeddingService
from app.services.chroma_service import chroma_service
import uuid


class IngestionService:
    """Service for document ingestion: chunk, embed, and store in ChromaDB"""

    @staticmethod
    async def ingest_document(
        document_id: str,
        document_text: str,
        metadata: Optional[Dict] = None,
        collection_name: str = "documents"
    ) -> Dict:
        """
        Ingest a document: chunk, embed, and store in ChromaDB
        
        Args:
            document_id: Unique document identifier
            document_text: Full text of the document
            metadata: Optional metadata for the document
            collection_name: Name of the ChromaDB collection
            
        Returns:
            Ingestion result with chunk count and status
            
        Flow:
            1. Create or get ChromaDB collection
            2. Split document into overlapping chunks
            3. Generate embeddings for all chunks (batch)
            4. Prepare metadata for each chunk
            5. Store chunks with embeddings in ChromaDB
        """
        try:
            # 1. Create or get collection
            collection_id = chroma_service.get_or_create_collection(
                collection_name,
                metadata={"type": "documents"}
            )

            # 2. Chunk the document
            chunks = EmbeddingService.chunk_text(document_text)
            print(f"📦 Created {len(chunks)} chunks from document '{document_id}'")

            # 3. Generate embeddings for chunks (batch processing)
            chunk_texts = [chunk[0] for chunk in chunks]
            embeddings = await embedding_service.generate_embeddings_batch(chunk_texts)
            print(f"🧠 Generated {len(embeddings)} embeddings")

            # 4. Prepare documents for ChromaDB
            ids = [f"{document_id}_chunk_{i}" for i, _ in chunks]
            metadatas = [
                {
                    "document_id": document_id,
                    "chunk_number": chunk_num,
                    "chunk_size": len(chunk_text),
                    **(metadata or {})
                }
                for chunk_text, chunk_num in chunks
            ]

            # 5. Store in ChromaDB
            chroma_service.add_documents(
                collection_name=collection_name,
                documents=chunk_texts,
                metadatas=metadatas,
                ids=ids,
                embeddings=embeddings
            )

            return {
                "status": "success",
                "document_id": document_id,
                "chunk_count": len(chunks),
                "collection_id": collection_id
            }

        except Exception as e:
            print(f"❌ Error ingesting document: {e}")
            raise

    @staticmethod
    def delete_document(
        document_id: str,
        collection_name: str = "documents"
    ) -> Dict:
        """
        Delete a document and its chunks from ChromaDB
        
        Args:
            document_id: Document to delete
            collection_name: Collection containing the document
            
        Returns:
            Deletion status
        """
        try:
            # Get all chunk IDs for this document
            # This would require querying ChromaDB for chunks with matching document_id
            # For now, implementation is framework-ready
            print(f"⚠️  Document deletion not yet fully implemented for document '{document_id}'")
            return {
                "status": "pending",
                "message": "Document deletion framework ready, full implementation pending"
            }
        except Exception as e:
            print(f"❌ Error deleting document: {e}")
            raise


# Create singleton instance
ingestion_service = IngestionService()

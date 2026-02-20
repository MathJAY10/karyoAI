"""
ChromaDB Service - Manages vector storage and retrieval
Handles collections, document storage, and semantic search
"""

from chromadb import HttpClient
import os
from typing import List, Dict, Optional, Tuple
from dotenv import load_dotenv

load_dotenv()

CHROMA_HOST = os.getenv("CHROMA_HOST", "localhost")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", "8000"))


class ChromaDBService:
    """Service to interact with ChromaDB for vector storage"""

    def __init__(self):
        """Initialize ChromaDB client"""
        self.client = HttpClient(host=CHROMA_HOST, port=CHROMA_PORT)
        self.collections = {}

    async def check_health(self) -> bool:
        """
        Check if ChromaDB is running and accessible
        
        Returns:
            True if healthy, False otherwise
        """
        try:
            # Test heartbeat
            _ = self.client.list_collections()
            return True
        except Exception as e:
            print(f"❌ ChromaDB health check failed: {e}")
            return False

    def get_or_create_collection(self, collection_name: str, metadata: Optional[Dict] = None) -> str:
        """
        Get or create a ChromaDB collection
        
        Args:
            collection_name: Name of the collection
            metadata: Optional metadata for the collection
            
        Returns:
            Collection ID
        """
        try:
            # Clean collection name (ChromaDB has strict naming rules)
            safe_name = collection_name.replace(" ", "_").replace("-", "_").lower()[:63]
            
            # Get or create collection
            collection = self.client.get_or_create_collection(
                name=safe_name,
                metadata=metadata or {}
            )
            
            self.collections[safe_name] = collection
            print(f"✅ Collection '{safe_name}' ready")
            return safe_name
        except Exception as e:
            print(f"❌ Error creating/getting collection: {e}")
            raise

    def add_documents(
        self,
        collection_name: str,
        documents: List[str],
        metadatas: List[Dict],
        ids: List[str],
        embeddings: List[List[float]]
    ) -> None:
        """
        Add documents (with pre-computed embeddings) to a collection
        
        Args:
            collection_name: Name of the collection
            documents: List of document texts
            metadatas: List of metadata dicts
            ids: List of document IDs
            embeddings: List of pre-computed embeddings
        """
        try:
            collection = self.get_collection(collection_name)
            
            collection.add(
                ids=ids,
                documents=documents,
                metadatas=metadatas,
                embeddings=embeddings
            )
            
            print(f"✅ Added {len(documents)} documents to '{collection_name}'")
        except Exception as e:
            print(f"❌ Error adding documents: {e}")
            raise

    def query(
        self,
        collection_name: str,
        query_texts: List[str],
        query_embeddings: Optional[List[List[float]]] = None,
        n_results: int = 5
    ) -> Dict:
        """
        Query a collection using text or embeddings
        
        Args:
            collection_name: Name of the collection
            query_texts: List of query texts (if not using embeddings)
            query_embeddings: Optional pre-computed query embeddings
            n_results: Number of results to return
            
        Returns:
            Query results with distances and metadata
        """
        try:
            collection = self.get_collection(collection_name)
            
            if query_embeddings:
                # Query using pre-computed embeddings
                results = collection.query(
                    query_embeddings=query_embeddings,
                    n_results=n_results
                )
            else:
                # Query using text (ChromaDB will embed internally)
                results = collection.query(
                    query_texts=query_texts,
                    n_results=n_results
                )
            
            return results
        except Exception as e:
            print(f"❌ Error querying collection: {e}")
            raise

    def get_collection(self, collection_name: str):
        """Get a collection by name"""
        safe_name = collection_name.replace(" ", "_").replace("-", "_").lower()[:63]
        
        if safe_name not in self.collections:
            self.collections[safe_name] = self.client.get_collection(name=safe_name)
        
        return self.collections[safe_name]

    def delete_collection(self, collection_name: str) -> None:
        """Delete a collection"""
        try:
            safe_name = collection_name.replace(" ", "_").replace("-", "_").lower()[:63]
            self.client.delete_collection(name=safe_name)
            
            if safe_name in self.collections:
                del self.collections[safe_name]
            
            print(f"✅ Deleted collection '{safe_name}'")
        except Exception as e:
            print(f"❌ Error deleting collection: {e}")
            raise

    def list_collections(self) -> List[str]:
        """List all available collections"""
        try:
            collections = self.client.list_collections()
            return [c.name for c in collections]
        except Exception as e:
            print(f"❌ Error listing collections: {e}")
            return []

    def get_collection_stats(self, collection_name: str) -> Dict:
        """Get statistics about a collection"""
        try:
            collection = self.get_collection(collection_name)
            count = collection.count()
            
            return {
                "name": collection_name,
                "document_count": count
            }
        except Exception as e:
            print(f"❌ Error getting collection stats: {e}")
            raise

    def delete_documents(self, collection_name: str, ids: List[str]) -> None:
        """Delete documents from a collection"""
        try:
            collection = self.get_collection(collection_name)
            collection.delete(ids=ids)
            print(f"✅ Deleted {len(ids)} documents from '{collection_name}'")
        except Exception as e:
            print(f"❌ Error deleting documents: {e}")
            raise


# Create singleton instance
chroma_service = ChromaDBService()

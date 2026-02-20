"""
Embedding Service - Generates embeddings using Ollama's embedding model
Handles document chunking and embedding generation
"""

import aiohttp
import os
from typing import List, Dict, Tuple
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "nomic-embed-text:latest")
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1000"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "200"))


class EmbeddingService:
    """Service to generate embeddings using Ollama"""

    @staticmethod
    def chunk_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[Tuple[str, int]]:
        """
        Split text into overlapping chunks
        
        Args:
            text: Text to chunk
            chunk_size: Size of each chunk
            overlap: Overlap between chunks
            
        Returns:
            List of (chunk_text, chunk_number) tuples
        """
        chunks = []
        chunk_number = 0
        start = 0
        
        while start < len(text):
            end = min(start + chunk_size, len(text))
            chunk = text[start:end]
            
            if chunk.strip():  # Only add non-empty chunks
                chunks.append((chunk, chunk_number))
                chunk_number += 1
            
            # Move forward by (chunk_size - overlap)
            start = end - overlap
            if start >= len(text):
                break
        
        return chunks

    @staticmethod
    async def generate_embedding(text: str, model: str = None) -> List[float]:
        """
        Generate embedding for text using Ollama
        
        Args:
            text: Text to embed
            model: Model to use (or use default from .env)
            
        Returns:
            Embedding vector
        """
        model_name = model or EMBEDDING_MODEL
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{OLLAMA_BASE_URL}/api/embeddings",
                    json={
                        "model": model_name,
                        "prompt": text
                    },
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("embedding", [])
                    else:
                        error_text = await response.text()
                        raise Exception(f"Embedding API error ({response.status}): {error_text}")
        except aiohttp.ClientError as e:
            raise Exception(f"Failed to connect to Ollama for embeddings: {str(e)}")

    @staticmethod
    async def generate_embeddings_batch(texts: List[str], model: str = None) -> List[List[float]]:
        """
        Generate embeddings for multiple texts
        
        Args:
            texts: List of texts to embed
            model: Model to use
            
        Returns:
            List of embedding vectors
        """
        embeddings = []
        for text in texts:
            embedding = await EmbeddingService.generate_embedding(text, model)
            embeddings.append(embedding)
        
        return embeddings

    @staticmethod
    async def check_embedding_model_available() -> bool:
        """
        Check if embedding model is available
        
        Returns:
            True if available, False otherwise
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{OLLAMA_BASE_URL}/api/tags",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        models = data.get("models", [])
                        model_names = [m.get("name") for m in models]
                        return any(EMBEDDING_MODEL in name for name in model_names)
                    return False
        except Exception as e:
            print(f"❌ Failed to check embedding model: {e}")
            return False


# Create singleton instance
embedding_service = EmbeddingService()

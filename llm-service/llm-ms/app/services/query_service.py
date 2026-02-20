"""
Query Service - Semantic search and RAG query pipeline
Handles context retrieval from vectors and LLM-augmented answer generation
"""

from typing import Dict, List, Optional
from app.services.embedding_service import embedding_service
from app.services.chroma_service import chroma_service
from app.services.ollama_service import ollama_service


class QueryService:
    """Service for query processing: retrieve context and generate RAG responses"""

    @staticmethod
    async def retrieve_context(
        query: str,
        collection_name: str = "documents",
        n_results: int = 5,
        query_embedding: Optional[List[float]] = None
    ) -> List[Dict]:
        """
        Retrieve relevant document chunks based on semantic similarity
        
        Args:
            query: User query or question
            collection_name: Name of the ChromaDB collection
            n_results: Number of top-k chunks to retrieve (default: 5)
            query_embedding: Optional pre-computed query embedding
            
        Returns:
            List of relevant chunks ranked by similarity
            
        Flow:
            1. Generate embedding for query (if not provided)
            2. Semantic search in ChromaDB (cosine similarity)
            3. Format and rank results by similarity score
            4. Return top-k chunks with metadata and relevance scores
        """
        try:
            # 1. Generate query embedding if not provided
            if not query_embedding:
                query_embedding = [await embedding_service.generate_embedding(query)]

            # 2. Query ChromaDB (semantic search)
            results = chroma_service.query(
                collection_name=collection_name,
                query_embeddings=query_embedding,
                n_results=n_results
            )

            # 3. Format results
            formatted_results = []
            
            for i, (doc_id, metadata, distance, chunk_text) in enumerate(
                zip(
                    results.get("ids", [[]])[0],
                    results.get("metadatas", [[]])[0],
                    results.get("distances", [[]])[0],
                    results.get("documents", [[]])[0]
                )
            ):
                formatted_results.append({
                    "rank": i + 1,
                    "chunk_id": doc_id,
                    "document_id": metadata.get("document_id"),
                    "chunk_number": metadata.get("chunk_number"),
                    "text": chunk_text,
                    "distance": float(distance),
                    "similarity": 1 - float(distance),  # Convert distance to similarity (0-1)
                    "metadata": metadata
                })

            print(f"🔍 Retrieved {len(formatted_results)} relevant chunks")
            return formatted_results

        except Exception as e:
            print(f"❌ Error retrieving context: {e}")
            raise

    @staticmethod
    async def rag_query(
        query: str,
        collection_name: str = "documents",
        n_context_chunks: int = 5,
        temperature: float = 0.7,
        max_tokens: int = 512
    ) -> Dict:
        """
        Execute full RAG pipeline: retrieve context and generate LLM answer
        
        Args:
            query: User question
            collection_name: ChromaDB collection name
            n_context_chunks: Number of top-k chunks for context (default: 5)
            temperature: LLM creativity (0.0-1.0, default: 0.7)
            max_tokens: Maximum response length (default: 512)
            
        Returns:
            Generated answer with retrieved context and metadata
            
        Flow:
            1. Retrieve top-k relevant chunks via semantic search
            2. Build context from retrieved chunks
            3. Create RAG prompt with context + question
            4. Send to LLM (Ollama) for answer generation
            5. Return answer with source chunks and confidence metrics
        """
        try:
            # 1. Retrieve relevant context chunks
            context_chunks = await QueryService.retrieve_context(
                query=query,
                collection_name=collection_name,
                n_results=n_context_chunks
            )

            if not context_chunks:
                return {
                    "answer": "No relevant documents found in the knowledge base.",
                    "context": [],
                    "source_count": 0
                }

            # 2. Build context from chunks
            context_text = "\n\n---\n\n".join([
                f"[Document: {chunk['document_id']}, Chunk {chunk['chunk_number']}]\n{chunk['text']}"
                for chunk in context_chunks
            ])

            # 3. Create RAG prompt with context and question
            rag_prompt = f"""Based on the following context, answer the question. 
If the context doesn't contain relevant information, say so.

CONTEXT:
{context_text}

QUESTION: {query}

ANSWER:"""

            # 4. Generate answer using LLM
            messages = [
                {
                    "role": "system",
                    "content": "You are a helpful assistant that answers questions based on provided context. Be concise and factual."
                },
                {
                    "role": "user",
                    "content": rag_prompt
                }
            ]

            response = await ollama_service.chat(
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )

            print(f"✅ RAG query completed with {len(context_chunks)} context chunks")

            return {
                "answer": response["response"],
                "context": context_chunks,
                "source_count": len(context_chunks),
                "model": response["model"]
            }

        except Exception as e:
            print(f"❌ Error in RAG query: {e}")
            raise


# Create singleton instance
query_service = QueryService()

import json
import logging
from typing import List, Dict
from pydantic import BaseModel
from app.services.chroma_service import chroma_service
from app.services.embedding_service import embedding_service
import httpx
import os

logger = logging.getLogger(__name__)

# Constants
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
MODEL_NAME = os.getenv("MODEL_NAME", "llama3.2:latest")
MEMORY_COLLECTION = "memory_facts"
SIMILARITY_THRESHOLD = 0.15 # Cosine distance threshold for deduplication

class MemoryExtractor:
    def __init__(self):
        # Ensure ChromaDB collection exists
        try:
            chroma_service.get_or_create_collection(MEMORY_COLLECTION)
        except Exception as e:
            logger.error(f"Failed to create memory collection: {e}")

    async def extract_facts(self, conversation_context: str) -> List[str]:
        """Call Ollama to extract atomic facts from the conversation context."""
        logger.info("[EXTRACTION] Starting fact extraction from conversation context")
        prompt = f"""You are a Knowledge Memory Extractor.
Analyze the following conversation and extract ATOMIC learning facts.

CRITICAL RULES:
1. Every fact MUST be a complete, self-contained sentence.
2. Every fact MUST explicitly state the primary subject, technology, or domain being discussed. 
3. DO NOT use pronouns (e.g. "it", "they").
4. Extract from the user's perspective.
5. Return ONLY a valid JSON array of strings. Do not add markdown blocks or conversational text.

BAD: "User learned about consumer groups."
GOOD: "User learned about consumer groups within Apache Kafka."

BAD: "User prefers to use Postgres for it."
GOOD: "User prefers to use PostgreSQL for relational databases."

Conversation:
{conversation_context}

Output JSON array:"""

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{OLLAMA_BASE_URL}/api/generate",
                    json={
                        "model": MODEL_NAME,
                        "prompt": prompt,
                        "stream": False,
                        "format": "json"
                    },
                    timeout=60.0
                )
                response.raise_for_status()
                result = response.json()
                
                # Parse JSON array
                facts = json.loads(result.get("response", "[]"))
                if not isinstance(facts, list):
                    logger.warning("[EXTRACTION] Ollama did not return a list. Fallback to empty list.")
                    return []
                
                logger.info(f"[EXTRACTION] Ollama extracted {len(facts)} atomic facts.")
                return [str(f) for f in facts if f]
        except Exception as e:
            logger.error(f"[EXTRACTION] Ollama extraction failed: {e}")
            return []

    async def is_duplicate(self, fact: str, user_id: int) -> bool:
        """Check if a highly similar fact already exists for this user in ChromaDB."""
        try:
            # 1. Embed the fact
            embedding = await embedding_service.generate_embedding(fact)
            
            # 2. Query ChromaDB for user's facts
            results = chroma_service.query_collection(
                collection_name=MEMORY_COLLECTION,
                query_embeddings=[embedding],
                n_results=1,
                metadata_filter={"userId": user_id}
            )
            
            # 3. Check distance threshold
            distances = results.get("distances", [[]])[0]
            if not distances:
                return False # No existing memories for user
                
            closest_distance = distances[0]
            
            if closest_distance < SIMILARITY_THRESHOLD:
                logger.info(f"[DEDUPE] Skipped fact: '{fact}' (Distance: {closest_distance} < Threshold: {SIMILARITY_THRESHOLD})")
                return True
                
            return False
            
        except Exception as e:
            logger.error(f"[DEDUPE] Deduplication check failed: {e}")
            return False

    async def process_session(self, session_id: int, user_id: int, conversation_context: str) -> Dict:
        """End-to-end extraction and deduplication."""
        logger.info(f"[EXTRACTION] Processing memory extraction for session {session_id}")
        
        # 1. Extract facts
        extracted_facts = await self.extract_facts(conversation_context)
        
        # 2. Deduplicate
        novel_facts = []
        for fact in extracted_facts:
            if not await self.is_duplicate(fact, user_id):
                novel_facts.append(fact)
                
        logger.info(f"[EXTRACTION] Completed processing for session {session_id}. Extracted {len(extracted_facts)} facts. {len(novel_facts)} are novel.")
        
        return {
            "extractedCount": len(extracted_facts),
            "novelCount": len(novel_facts),
            "novelFacts": novel_facts
        }

    async def store_embedding(self, memory_fact_id: int, user_id: int, session_id: int, content: str):
        """Store the fact embedding into ChromaDB after Node.js saves it to Prisma."""
        try:
            embedding = await embedding_service.generate_embedding(content)
            
            # Generate unique ID for Chroma document
            doc_id = f"mem_{memory_fact_id}"
            
            metadata = {
                "memoryFactId": memory_fact_id,
                "userId": user_id,
                "chatSessionId": session_id,
                "sourceType": "ai_chat"
            }
            
            chroma_service.add_documents(
                collection_name=MEMORY_COLLECTION,
                documents=[content],
                embeddings=[embedding],
                metadatas=[metadata],
                ids=[doc_id]
            )
            logger.info(f"[EMBEDDING] Indexed fact {memory_fact_id} to ChromaDB.")
            return True
        except Exception as e:
            logger.error(f"[CRITICAL] ChromaDB insertion failed for fact {memory_fact_id}: {e}")
            return False

memory_extractor = MemoryExtractor()

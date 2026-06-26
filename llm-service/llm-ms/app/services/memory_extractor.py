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

    async def extract_facts(self, conversation_context: str) -> List[Dict[str, str]]:
        """Call Ollama to extract atomic facts from the conversation context."""
        logger.info("[EXTRACTION] Starting fact extraction from conversation context")
        prompt = f"""You are a User Profile & Memory Extractor.
Analyze the following conversation and extract ATOMIC facts about the USER.

CRITICAL RULES:
1. Extract ONLY user profile information, such as their interests, projects, or background.
2. If the user asks about specific topics (e.g., "DSA", "computer networks", "Kafka", "Redis"), infer and extract it as an INTEREST.
3. Ignore the AI's textbook explanations, but capture the user's implicit interests based on their questions.
4. Every fact must start with "User".
5. Use exactly one enum for the "type" field:
IDENTITY
PREFERENCE
PROJECT
GOAL
DECISION
CONSTRAINT
INTEREST
UNKNOWN

6. You MUST return a JSON object with a single key "facts" containing an array of your extractions.

If there is absolutely no useful user information, return an empty array EXACTLY like this:
{{
  "facts": []
}}

Example 1:
{{
  "facts": [
    {{
      "type": "INTEREST",
      "content": "User is interested in learning about Data Structures and Algorithms (DSA)."
    }},
    {{
      "type": "INTEREST",
      "content": "User is interested in learning Apache Kafka Consumer Groups."
    }},
    {{
      "type": "INTEREST",
      "content": "User is interested in learning Redis Streams."
    }}
  ]
}}

Example 2 (No useful info):
{{
  "facts": []
}}

Conversation:
{conversation_context}

Output JSON object:"""

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
                    timeout=120.0
                )
                response.raise_for_status()
                result = response.json()
                
                raw_response = result.get("response", "[]")
                logger.info(f"[MEMORY_EXTRACTOR_RAW] {raw_response}")
                
                # Parse JSON array/object safely
                facts = []
                try:
                    parsed = json.loads(raw_response)
                    if isinstance(parsed, dict):
                        facts = parsed.get("facts", [])
                    elif isinstance(parsed, list):
                        facts = parsed
                except json.JSONDecodeError as e:
                    logger.error(f"[EXTRACTION] JSON parsing failed: {e}")
                
                if not isinstance(facts, list):
                    logger.warning("[EXTRACTION] Ollama did not return a valid list structure. Fallback to empty list.")
                    facts = []
                
                logger.info(f"[MEMORY_EXTRACTOR_PARSED] Count before validation: {len(facts)}")
                
                VALID_TYPES = {
                    "IDENTITY", "PREFERENCE", "PROJECT", "GOAL", 
                    "DECISION", "CONSTRAINT", "INTEREST", "UNKNOWN"
                }
                
                validated_facts = []
                for f in facts:
                    if not isinstance(f, dict):
                        continue
                    
                    fact_type = str(f.get("type", "UNKNOWN")).upper()
                    if fact_type not in VALID_TYPES:
                        fact_type = "UNKNOWN"
                        
                    content = str(f.get("content", "")).strip()
                    if content:
                        validated_facts.append({
                            "type": fact_type,
                            "content": content
                        })
                
                logger.info(f"[MEMORY_EXTRACTOR_FACT_COUNT] Ollama extracted {len(validated_facts)} atomic facts.")
                return validated_facts
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
            if not await self.is_duplicate(fact["content"], user_id):
                novel_facts.append(fact)
                
        logger.info(f"[EXTRACTION] Completed processing for session {session_id}. Extracted {len(extracted_facts)} facts. {len(novel_facts)} are novel.")
        
        return {
            "extractedCount": len(extracted_facts),
            "novelCount": len(novel_facts),
            "novelFacts": novel_facts
        }

    async def store_embedding(self, memory_fact_id: int, user_id: int, session_id: int, content: str, memory_type: str = "UNKNOWN"):
        """Store the fact embedding into ChromaDB after Node.js saves it to Prisma."""
        try:
            embedding = await embedding_service.generate_embedding(content)
            
            # Generate unique ID for Chroma document
            doc_id = f"mem_{memory_fact_id}"
            
            metadata = {
                "memoryFactId": memory_fact_id,
                "userId": user_id,
                "chatSessionId": session_id,
                "sourceType": "ai_chat",
                "memoryType": memory_type
            }
            
            chroma_service.add_documents(
                collection_name=MEMORY_COLLECTION,
                documents=[content],
                embeddings=[embedding],
                metadatas=[metadata],
                ids=[doc_id]
            )
            logger.info(f"[EMBEDDING] Indexed fact {memory_fact_id} of type {memory_type} to ChromaDB.")
            return True
        except Exception as e:
            logger.error(f"[CRITICAL] ChromaDB insertion failed for fact {memory_fact_id}: {e}")
            return False

memory_extractor = MemoryExtractor()

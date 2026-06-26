from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
import logging
from app.services.ollama_service import ollama_service
from app.services.chroma_service import chroma_service
from app.services.embedding_service import embedding_service

router = APIRouter()
logger = logging.getLogger(__name__)

class SummarizeDiscussionRequest(BaseModel):
    session_id: int
    workspace_id: Optional[int] = None
    document_id: Optional[int] = None
    user_id: int
    source_type: str
    transcript: str

class SummarizeDiscussionResponse(BaseModel):
    topic: str
    summary: str
    keyPoints: List[str]
    embedding_status: str

@router.post("/summarize", response_model=SummarizeDiscussionResponse)
async def summarize_discussion(request: SummarizeDiscussionRequest):
    """
    Summarize a chat session transcript and embed it into the chat_discussions Chroma collection.
    """
    try:
        # 1. Prompt the LLM for summarization
        system_prompt = (
            "You are an expert conversation summarizer. Analyze the provided chat transcript "
            "and produce a structured JSON output with no extra text. "
            "Focus on what topics were discussed, what the user asked, what the assistant explained, "
            "and which concepts came up.\n\n"
            "Respond ONLY with valid JSON in this exact format:\n"
            "{\n"
            "  \"topic\": \"Brief 3-5 word title of the main topic\",\n"
            "  \"summary\": \"Concise paragraph summarizing the questions and explanations\",\n"
            "  \"keyPoints\": [\"Point 1\", \"Point 2\", \"Point 3\"]\n"
            "}"
        )
        
        user_prompt = f"Here is the transcript to summarize:\n\n{request.transcript}"
        
        logger.info(f"Generating summary for session {request.session_id}")
        
        # Use generate for summarization
        response_data = await ollama_service.generate(
            prompt=f"{system_prompt}\n\n{user_prompt}",
            temperature=0.3,
            max_tokens=1000
        )
        response_text = response_data.get("response", "")
        
        # 2. Parse the JSON
        import json
        try:
            # Often the model wraps JSON in markdown blocks
            clean_text = response_text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            if clean_text.startswith("```"):
                clean_text = clean_text[3:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
                
            parsed = json.loads(clean_text.strip())
            topic = parsed.get("topic", f"{request.source_type} discussion")
            summary = parsed.get("summary", "")
            keyPoints = parsed.get("keyPoints", [])
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON from LLM: {response_text}")
            topic = "Discussion Summary"
            summary = response_text
            keyPoints = []
            
        # 3. Embed into ChromaDB
        embedding_status = "PENDING"
        try:
            collection_name = "chat_discussions"
            
            # Text to embed is a rich combination of topic, summary, and key points
            text_to_embed = f"Topic: {topic}\nSummary: {summary}\nKey Points: {', '.join(keyPoints)}"
            
            embedding = await embedding_service.generate_embedding(text_to_embed)
            
            # The ID in chroma can just be the session ID string (since we are doing 1:1 rolling summary per session)
            chroma_id = f"discussion_{request.source_type}_{request.session_id}"
            
            metadata = {
                "session_id": request.session_id,
                "user_id": request.user_id,
                "workspace_id": request.workspace_id or -1,
                "document_id": request.document_id or -1,
                "source_type": request.source_type,
                "topic": topic
            }
            
            chroma_service.get_or_create_collection(collection_name)
            
            chroma_service.add_documents(
                collection_name=collection_name,
                documents=[text_to_embed],
                metadatas=[metadata],
                ids=[chroma_id],
                embeddings=[embedding]
            )
            embedding_status = "INDEXED"
            logger.info(f"Successfully embedded discussion {chroma_id} into Chroma")
            
        except Exception as e:
            logger.error(f"Failed to embed discussion summary for session {request.session_id}: {str(e)}")
            embedding_status = "FAILED"
            
        return SummarizeDiscussionResponse(
            topic=topic,
            summary=summary,
            keyPoints=keyPoints,
            embedding_status=embedding_status
        )
        
    except Exception as e:
        logger.error(f"Discussion summarization failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Discussion summarization failed: {str(e)}"
        )

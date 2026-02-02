"""
Chat API Routes
Defines endpoints for chatting with the LLM and checking health
"""

from fastapi import APIRouter, HTTPException, status
from app.models.schemas import ChatRequest, ChatResponse, HealthResponse
from app.services.ollama_service import ollama_service
import os

# Create router (will be registered in main.py)
router = APIRouter()

@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat_completion(request: ChatRequest):
    """
    Generate chat completion using Ollama
    
    This endpoint is compatible with OpenAI's chat format:
    - messages: List of {role, content} objects
    - temperature: Controls randomness (0-2)
    - max_tokens: Maximum response length (1-4096)
    
    Example:
        POST /api/llm/chat
        {
            "messages": [
                {"role": "user", "content": "Write a greeting"}
            ],
            "temperature": 0.7,
            "max_tokens": 100
        }
    """
    try:
        # Check if Ollama is running
        is_healthy = await ollama_service.check_health()
        if not is_healthy:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Ollama service is not running. Please start Ollama with 'docker start llm-service'"
            )
        
        # Convert Pydantic models to dictionaries
        messages = [msg.dict() for msg in request.messages]
        
        # Generate response using Ollama
        result = await ollama_service.chat(
            messages=messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            model=request.model
        )
        
        # Return formatted response
        return ChatResponse(
            response=result["response"],
            model=result["model"],
            tokens_used=result.get("tokens_used")
        )
    
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Catch any other errors and return 500
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating response: {str(e)}"
        )

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Check if LLM service and Ollama are running
    
    Returns:
        - status: "healthy" or "unhealthy"
        - service: Service name
        - model: Currently configured model
        - ollama_status: "running" or "not running"
        
    Example:
        GET /api/llm/health
    """
    is_ollama_healthy = await ollama_service.check_health()
    
    return HealthResponse(
        status="healthy" if is_ollama_healthy else "degraded",
        service="KaryoAI LLM Service",
        model=os.getenv("MODEL_NAME", "llama3.2:latest"),
        ollama_status="running" if is_ollama_healthy else "not running"
    )

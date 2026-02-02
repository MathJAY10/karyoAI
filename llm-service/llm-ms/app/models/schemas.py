"""
Pydantic models for request/response validation
These define the structure and types of data the API accepts and returns
"""

from pydantic import BaseModel, Field
from typing import List, Optional

class Message(BaseModel):
    """Single chat message"""
    role: str = Field(..., description="Role: 'system', 'user', or 'assistant'")
    content: str = Field(..., description="Message content")

class ChatRequest(BaseModel):
    """Request body for chat endpoint"""
    messages: List[Message]
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0, description="Creativity (0=deterministic, 2=very creative)")
    max_tokens: Optional[int] = Field(512, ge=1, le=4096, description="Maximum response length")
    model: Optional[str] = Field(None, description="Override default model")

class ChatResponse(BaseModel):
    """Response from chat endpoint"""
    response: str = Field(..., description="Generated text")
    model: str = Field(..., description="Model used for generation")
    tokens_used: Optional[int] = Field(None, description="Number of tokens in response")

class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="Service status: 'healthy' or 'unhealthy'")
    service: str = Field(..., description="Service name")
    model: str = Field(..., description="Currently configured model")
    ollama_status: str = Field(..., description="Ollama service status")

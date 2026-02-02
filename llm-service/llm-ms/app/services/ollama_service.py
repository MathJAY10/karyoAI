"""
Ollama Service - Handles communication with Ollama API
This is the bridge between FastAPI and Ollama (running in Docker)
"""

import aiohttp
import os
from typing import List, Dict
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get configuration from .env
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
MODEL_NAME = os.getenv("MODEL_NAME", "llama3.2:latest")

class OllamaService:
    """Service to interact with Ollama API"""
    
    @staticmethod
    async def check_health() -> bool:
        """
        Check if Ollama is running and accessible
        Returns: True if healthy, False otherwise
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{OLLAMA_BASE_URL}/api/tags",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    return response.status == 200
        except Exception as e:
            print(f"❌ Ollama health check failed: {e}")
            return False
    
    @staticmethod
    async def generate(
        prompt: str, 
        temperature: float = 0.7, 
        max_tokens: int = 512, 
        model: str = None
    ) -> Dict:
        """
        Generate text using Ollama
        
        Args:
            prompt: Input text to generate from
            temperature: Creativity (0=deterministic, 2=creative)
            max_tokens: Maximum length of response
            model: Model to use (or use default from .env)
            
        Returns:
            Dict with response, model name, and token count
        """
        model_name = model or MODEL_NAME
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{OLLAMA_BASE_URL}/api/generate",
                    json={
                        "model": model_name,
                        "prompt": prompt,
                        "stream": False,  # Don't stream, return all at once
                        "options": {
                            "temperature": temperature,
                            "num_predict": max_tokens,
                            "top_p": 0.9,
                        }
                    },
                    timeout=aiohttp.ClientTimeout(total=180)  # 3 minute timeout
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return {
                            "response": data.get("response", ""),
                            "model": data.get("model", model_name),
                            "tokens_used": data.get("eval_count", 0)
                        }
                    else:
                        error_text = await response.text()
                        raise Exception(f"Ollama API error ({response.status}): {error_text}")
        except aiohttp.ClientError as e:
            raise Exception(f"Failed to connect to Ollama: {str(e)}")
    
    @staticmethod
    async def chat(
        messages: List[Dict], 
        temperature: float = 0.7, 
        max_tokens: int = 512, 
        model: str = None
    ) -> Dict:
        """
        Chat with Ollama (converts chat messages to a single prompt)
        
        Args:
            messages: List of {role, content} dicts
            temperature: Creativity level
            max_tokens: Max response length
            model: Model to use
            
        Returns:
            Dict with response, model, tokens
        """
        # Convert chat messages to a single prompt
        prompt_parts = []
        
        for msg in messages:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            
            if role == 'system':
                prompt_parts.append(f"System: {content}")
            elif role == 'user':
                prompt_parts.append(f"User: {content}")
            elif role == 'assistant':
                prompt_parts.append(f"Assistant: {content}")
        
        # Add "Assistant:" at the end to prompt the model to respond
        prompt_parts.append("Assistant:")
        prompt = "\n\n".join(prompt_parts)
        
        # Call the generate method
        return await OllamaService.generate(prompt, temperature, max_tokens, model)

# Create a singleton instance
ollama_service = OllamaService()

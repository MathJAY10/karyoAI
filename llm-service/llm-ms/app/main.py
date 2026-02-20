"""
KaryoAI LLM Service - Main Application
FastAPI server that provides LLM capabilities using self-hosted Llama models
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os
import time

# Load environment variables from .env file
load_dotenv()

# Import routes
from app.routes import chat, rag

# Create FastAPI application
app = FastAPI(
    title="KaryoAI LLM Service",
    description="Self-hosted Llama LLM API for KaryoAI platform. Replaces OpenAI API with local inference.",
    version="1.0.0",
    docs_url="/docs",  # Swagger UI at /docs
    redoc_url="/redoc"  # ReDoc at /redoc
)

# CORS Configuration - Allow frontend and backend to call this API
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,  # Allow these origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Request logging middleware - logs every request
@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests with timing"""
    start_time = time.time()
    
    # Process request
    response = await call_next(request)
    
    # Calculate duration
    process_time = time.time() - start_time
    
    # Log to console
    print(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.2f}s")
    
    return response

# Include routers (API endpoints)
app.include_router(chat.router, prefix="/api/llm", tags=["LLM"])
app.include_router(rag.router, prefix="/api/rag", tags=["RAG"])

# Root endpoint
@app.get("/")
async def root():
    """
    Root endpoint - shows service info
    """
    return {
        "service": "KaryoAI LLM Service",
        "status": "running",
        "version": "1.0.0",
        "model": os.getenv("MODEL_NAME", "llama3.2:latest"),
        "docs": "/docs",
        "health": "/api/llm/health"
    }

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch all unhandled exceptions and return a proper error response
    """
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc),
            "path": request.url.path
        }
    )

# Startup event
@app.on_event("startup")
async def startup_event():
    """
    Run when the service starts
    """
    print("=" * 50)
    print("🚀 KaryoAI LLM Service Starting...")
    print(f"📝 Model: {os.getenv('MODEL_NAME', 'llama3.2:latest')}")
    print(f"🔗 Ollama: {os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')}")
    print(f"🌐 CORS Origins: {CORS_ORIGINS}")
    print(f"📚 API Docs: http://localhost:{os.getenv('PORT', '8001')}/docs")
    print("=" * 50)

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """
    Run when the service stops
    """
    print("🛑 KaryoAI LLM Service Shutting Down...")

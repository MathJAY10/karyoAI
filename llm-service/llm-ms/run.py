"""
Convenience launcher for the KaryoAI LLM service.

This wrapper loads the local .env file and starts Uvicorn on the port
configured for the rest of the application stack.
"""

from pathlib import Path
import os

import uvicorn
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8001"))
    host = os.getenv("HOST", "0.0.0.0")

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=True,
    )
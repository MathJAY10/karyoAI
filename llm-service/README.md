# LLM Service (FastAPI)

This folder contains the Python LLM microservice used by KaryoAI.

## Important

Use `python run.py` to start the service.

- `run.py` loads `llm-ms/.env`
- The default service port is `8001` (from `.env`), not hardcoded `8000`

## Folder

- Service code: `llm-ms/`

## Quick Start (Windows)

```powershell
cd llm-ms
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python run.py
```

## Quick Start (macOS/Linux)

```bash
cd llm-ms
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```

## Default URLs

When started with current `.env`:

- Service root: `http://localhost:8001/`
- Swagger docs: `http://localhost:8001/docs`
- LLM health: `http://localhost:8001/api/llm/health`
- RAG health: `http://localhost:8001/api/rag/health`

## Current Environment Settings

From `llm-ms/.env`:

- `PORT=8001`
- `OLLAMA_BASE_URL=http://localhost:18080`
- `MODEL_NAME=llama3.2:latest`

## Optional: Run with Uvicorn directly

If you do not use `run.py`, make sure port matches your backend config:

```bash
uvicorn app.main:app --reload --port 8001
```

Running Uvicorn on `8000` while backend points to `8001` will cause connection errors.

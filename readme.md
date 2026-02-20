# KaryoAI - AI-Powered Productivity Suite

A comprehensive AI-powered platform with multiple tools and **Retrieval-Augmented Generation (RAG)** for semantic document understanding.

> **🎯 New**: Full RAG pipeline implemented! See [RAG Quick Start](backend/RAG_QUICK_START.md)
## 🚀 Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop) (for Windows/Mac/Linux)
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Python](https://www.python.org/downloads/) (v3.9 or higher)
- [Git](https://git-scm.com/)

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd karyoAI
```

### 2. Start Docker Services

This will start PostgreSQL, Ollama (LLM), and ChromaDB:

```bash
docker-compose up -d
```

**Note**: First-time setup will take 5-10 minutes to download the Ollama model (~2-4GB).

Check if all services are running:

```bash
docker-compose ps
```

You should see all containers in "Up" state.

### 3. Setup Backend (Node.js/Express)

```bash
cd backend

# Install dependencies
npm install



# Run database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Start backend server
npm run dev
```

Backend will run on: `http://localhost:3000`

### 4. Setup LLM Service (Python/FastAPI)

Open a new terminal:

```bash
cd llm-service/llm-ms

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate


# Install dependencies
pip install -r requirements.txt




# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

LLM Service will run on: `http://localhost:8000`

### 5. Setup Frontend

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install


# Start frontend development server
npm run dev
```

Frontend will run on: `http://localhost:5173`





## 📦 Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 5173 | React + Vite application |
| Backend | 3000 | Express.js API server |
| **LLM Service** | **8001** | **FastAPI LLM microservice** |
| PostgreSQL | 5432 | Database |
| Ollama | 18080 | Local LLM service |
| ChromaDB | 8000 | Vector database |


## 🛠️ Useful Commands

### Docker

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker logs karyoai_postgres -f
docker logs karyoai_ollama -f
docker logs karyoai_chroma -f

# Restart services
docker-compose restart

# Remove all data and start fresh
docker-compose down -v
```

### Database

```bash
# View database with Prisma Studio (GUI)
cd backend
npx prisma studio
# Opens at http://localhost:5555

# Access PostgreSQL CLI
docker exec -it karyoai_postgres psql -U karyoai -d karyoai

# Run migrations
npx prisma migrate dev

# Reset database
npx prisma migrate reset
```

### Ollama (LLM)

```bash
# List installed models
docker exec -it karyoai_ollama ollama list

# Pull a different model
docker exec -it karyoai_ollama ollama pull mistral

# Test model
docker exec -it karyoai_ollama ollama run llama3.2
```

### LLM Service (FastAPI)

```bash
# Run with auto-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

# View API docs
# http://localhost:8001/docs

# Test health endpoint
curl http://localhost:8001/health
```






## 🐛 Troubleshooting

### Port Already in Use

```bash
# Windows - Find and kill process on port
netstat -ano | findstr :3000
taskkill /PID <process_id> /F

# Or change port in .env files
```

### Docker Services Not Starting

```bash
# Check Docker Desktop is running
docker ps

# Remove old containers
docker-compose down
docker rm -f karyoai_postgres karyoai_ollama karyoai_chroma

# Start fresh
docker-compose up -d
```

### Database Connection Error

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check connection
docker exec -it karyoai_postgres psql -U karyoai -d karyoai -c "SELECT 1"

# Verify DATABASE_URL in backend/.env matches docker-compose.yml
```

### Ollama Model Not Loading

```bash
# Check if model is downloaded
docker exec -it karyoai_ollama ollama list

# Manually pull model
docker exec -it karyoai_ollama ollama pull llama3.2

# Check logs
docker logs karyoai_ollama -f
```

### LLM Service Connection Error

```bash
# Check if FastAPI is running
curl http://localhost:8001/health

# Check Ollama connection
docker exec -it karyoai_ollama ollama list

# Verify OLLAMA_BASE_URL in llm-service/.env
```

## 📁 Project Structure

```
karyoAI/
├── docker-compose.yml       # Docker services configuration
├── frontend/                # React frontend
│   ├── src/
│   ├── package.json
│   └── .env
├── backend/                 # Express.js backend
│   ├── src/
│   ├── prisma/
│   ├── package.json
│   └── .env
└── llm-service/            # Python FastAPI LLM microservice
    └── llm-ms/
        ├── app/
        ├── requirements.txt
        └── .env
```







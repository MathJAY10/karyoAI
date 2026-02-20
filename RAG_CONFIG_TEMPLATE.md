# RAG Configuration Template

Copy this to your `.env` files and adjust as needed.

## Backend Configuration

**File: `backend/.env`**

```env
# ==================== RAG Configuration ====================
# Enable RAG pipeline (true/false)
USE_RAG=true

# RAG Service URL (LLM service endpoint)
RAG_SERVICE_URL=http://localhost:8001

# ChromaDB Configuration
CHROMA_HOST=localhost
CHROMA_PORT=8000

# Embedding Configuration
EMBEDDING_MODEL=nomic-embed-text:latest
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# ==================== Existing Configuration ====================
# Database
DATABASE_URL=postgresql://karyoai:karyoai_secure_password@localhost:5432/karyoai

# JWT
JWT_SECRET=your_jwt_secret_key_here

# Server
PORT=3000
NODE_ENV=development
BACKEND_URL=http://localhost:3000

# OpenAI (fallback, still used for non-RAG features)
OPENAI_API_KEY=sk-your-key-here

# LLM Service
LLM_SERVICE_URL=http://localhost:8001
```

## LLM Service Configuration

**File: `llm-service/llm-ms/.env`**

```env
# ==================== RAG & Embedding Configuration ====================
# ChromaDB Configuration
CHROMA_HOST=localhost
CHROMA_PORT=8000
CHROMA_PORT_INTERNAL=8000

# Embedding Model Configuration
EMBEDDING_MODEL=nomic-embed-text:latest

# Document Chunking Configuration
CHUNK_SIZE=1000           # Characters per chunk (larger = fewer chunks)
CHUNK_OVERLAP=200         # Character overlap between chunks

# ==================== Ollama Configuration ====================
# Ollama Server (Container)
OLLAMA_BASE_URL=http://ollama:11434
# Ollama Server (Local/Host)
# OLLAMA_BASE_URL=http://localhost:18080

# Model Configuration
MODEL_NAME=llama3.2:latest

# CORS Configuration
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:5000

# Server Configuration
PORT=8001
HOST=0.0.0.0
```

## Docker Compose Configuration

**File: `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: karyoai
      POSTGRES_PASSWORD: karyoai_secure_password
      POSTGRES_DB: karyoai
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  ollama:
    image: ollama/ollama:latest
    ports:
      - "18080:11434"    # For local testing
    volumes:
      - ollama_data:/root/.ollama
    environment:
      OLLAMA_HOST=0.0.0.0

  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - chroma_data:/chroma/chroma
    environment:
      IS_PERSISTENT=TRUE

volumes:
  postgres_data:
  ollama_data:
  chroma_data:
```

---

## Recommended Settings by Use Case

### Development (Local Testing)

```env
# Backend
USE_RAG=true
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# LLM Service
EMBEDDING_MODEL=nomic-embed-text:latest
CORS_ORIGINS=http://localhost:*
```

### Production

```env
# Backend
USE_RAG=true
CHUNK_SIZE=1500          # Slightly larger chunks
CHUNK_OVERLAP=300        # More overlap for better context

# LLM Service
EMBEDDING_MODEL=nomic-embed-text:latest
CORS_ORIGINS=https://yourdomain.com
```

### High-Performance (Larger Documents)

```env
CHUNK_SIZE=1500
CHUNK_OVERLAP=200
# Larger chunks = fewer embeddings = faster processing
```

### High-Precision (Better Quality)

```env
CHUNK_SIZE=800
CHUNK_OVERLAP=300
# Smaller chunks = more granular retrieval = better precision
```

### Memory-Constrained

```env
CHUNK_SIZE=2000
CHUNK_OVERLAP=100
# Larger chunks = lower memory usage = fewer vector entries
```

---

## Health Check Commands

### ChromaDB Health

```bash
curl http://localhost:8000/heartbeat
```

Expected: `true`

### Embedding Model Available

```bash
curl http://localhost:18080/api/tags | grep nomic-embed-text
```

### RAG System Health

```bash
curl http://localhost:8001/api/rag/rag/health
```

Expected:
```json
{
  "status": "healthy",
  "chromadb": "running",
  "embedding_model": "nomic-embed-text:latest available",
  "chunk_size": 1000,
  "chunk_overlap": 200
}
```

---

## Troubleshooting

### Container Port Already in Use

If you get "port already in use" errors:

```bash
# Find process using the port
lsof -i :8000    # ChromaDB
lsof -i :18080   # Ollama
lsof -i :5432    # PostgreSQL

# Kill the process
kill -9 <PID>

# Or change the port in docker-compose.yml
```

### ChromaDB Persistent Data Not Retained

Ensure volume is properly mounted:

```bash
docker volume ls
docker inspect chroma_data
```

### Ollama Model Not Loading

```bash
# Pull model explicitly
docker exec karyoai_ollama ollama pull nomic-embed-text:latest

# Verify
docker exec karyoai_ollama ollama list
```

### Database Migration Issues

```bash
# Reset database (WARNING: Deletes all data)
cd backend
npx prisma migrate reset

# Or manually apply pending migrations
npx prisma migrate deploy
```

---

## Advanced Configuration

### Using Remote ChromaDB

```env
CHROMA_HOST=remote-chroma-server.com
CHROMA_PORT=8000
```

### Custom Embedding Model

To use a different embedding model:

1. Pull model in Ollama:
   ```bash
   docker exec karyoai_ollama ollama pull all-minilm:latest
   ```

2. Update `.env`:
   ```env
   EMBEDDING_MODEL=all-minilm:latest
   ```

Available Ollama models:
- `all-minilm:latest` - Fast, small (384 dims)
- `nomic-embed-text:latest` - Balanced (768 dims) ✅ **Recommended**
- `mistral:latest` - High quality, slower

### Scaling for Production

1. **Multiple LLM instances**: Load balance across services
2. **ChromaDB cluster**: Uses Chroma's distribution mode
3. **Database connection pooling**: Prisma handles this
4. **Caching layer**: Add Redis for embedding cache

---

## Monitoring & Logging

### Docker Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker logs -f karyoai_chroma
docker logs -f karyoai_ollama
```

### Application Logs

Backend logs go to stdout. LLM service logs show:
- Request timing
- Embedding generation time
- Retrieval results
- Error traces

### Metrics to Monitor

- Embedding generation latency
- ChromaDB query time
- Memory usage per service
- Document ingestion time
- RAG fallback rate

---

## Security Considerations

### Production Checklist

- [ ] Change all default passwords
- [ ] Enable HTTPS for APIs
- [ ] Restrict CORS origins
- [ ] Set proper firewall rules
- [ ] Enable database backups
- [ ] Monitor unauthorized access
- [ ] Encrypt ChromaDB volumes
- [ ] Use strong JWT secrets
- [ ] Regular security audits

### Data Privacy

- User data isolated by collection
- No external API calls for embeddings
- All processing local
- Audit trail in database

---

## Quick Reset (Development Only)

To reset everything and start fresh:

```bash
# Stop all services
docker-compose down

# Remove volumes (WARNING: Deletes all data)
docker-compose down -v

# Start fresh
docker-compose up -d

# Reset database
cd backend
npx prisma migrate reset
```

---

## Files

This template helps configure:
- ✅ Backend Express.js service
- ✅ LLM FastAPI service
- ✅ ChromaDB vector database
- ✅ Ollama embedding/LLM service
- ✅ PostgreSQL database
- ✅ Docker containers

Check [RAG_IMPLEMENTATION.md](RAG_IMPLEMENTATION.md) for detailed configuration explanations.

# RAG Implementation - Deployment Checklist

## Pre-Deployment ✅

### Code Review
- [x] All new services reviewed
- [x] No breaking changes to existing code
- [x] Error handling in place
- [x] Logging comprehensive
- [x] Type safety verified (TS + Python)
- [x] Documentation complete

### Testing
- [x] Chunking algorithm verified
- [x] Embedding generation tested
- [x] ChromaDB connection working
- [x] API endpoints functional
- [x] Fallback mechanism validated
- [x] Multi-tenant isolation confirmed

### Configuration
- [x] Environment variables documented
- [x] Default values sensible
- [x] Configuration template provided
- [x] Health checks implemented

---

## Deployment Steps

### 1. Database Migration ⚡
```bash
cd backend
npm run db:generate      # Refresh Prisma client
npm run db:migrate       # Apply migrations (creates Document & Chunk tables)
```
- [ ] Verify migration succeeded
- [ ] Check `documents` table created
- [ ] Check `chunks` table created
- [ ] Verify indexes were created

### 2. Environment Configuration 🔧
```bash
# In backend/.env
USE_RAG=true
CHROMA_HOST=localhost
CHROMA_PORT=8000
EMBEDDING_MODEL=nomic-embed-text:latest

# In llm-service/.env  
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```
- [ ] `USE_RAG` set to `true`
- [ ] `CHROMA_HOST` points to Docker service
- [ ] `CHROMA_PORT` is 8000
- [ ] `EMBEDDING_MODEL` correct

### 3. Docker Services ⛴️
```bash
# From root directory
docker compose up -d
docker compose ps
```
- [ ] `postgres` running ✅
- [ ] `ollama` running ✅
- [ ] `chromadb` running ✅
- [ ] All services healthy

### 4. Service Startup 🚀
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: LLM Service
cd llm-service/llm-ms
python -m uvicorn app.main:app --reload --port 8001

# Terminal 3: Frontend
cd frontend
npm run dev
```
- [ ] Backend running on :3000
- [ ] LLM service running on :8001
- [ ] Frontend running on :5173
- [ ] No errors in logs

### 5. Health Verification ✔️
```bash
# Test ChromaDB
curl http://localhost:8000/heartbeat
# Expected: true

# Test Ollama
curl http://localhost:18080/api/tags | grep nomic-embed
# Expected: model found

# Test RAG health
curl http://localhost:8001/api/rag/rag/health
# Expected: {"status": "healthy", ...}

# Test LLM service
curl http://localhost:8001/
# Expected: Service info JSON
```
- [ ] ChromaDB heartbeat returns `true`
- [ ] Embedding model found in Ollama
- [ ] RAG health shows "healthy"
- [ ] LLM service responds to requests

---

## Functional Testing

### Test 1: Document Ingestion
```bash
curl -X POST http://localhost:8001/api/rag/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "test_doc_1",
    "document_text": "The company revenue for 2024 was $5.2 million.",
    "collection_name": "documents"
  }'
```
Expected response:
```json
{
  "status": "success",
  "document_id": "test_doc_1",
  "chunk_count": 1,
  "collection_id": "documents"
}
```
- [ ] Status is "success"
- [ ] Chunk count > 0
- [ ] Collection ID returned

### Test 2: Context Retrieval
```bash
curl -X POST http://localhost:8001/api/rag/retrieve \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What was the revenue in 2024?",
    "collection_name": "documents",
    "n_results": 1
  }'
```
Expected: Retrieved chunks with high similarity
- [ ] Chunk count > 0
- [ ] Similarity score > 0.8
- [ ] Relevant text returned

### Test 3: RAG Query
```bash
curl -X POST http://localhost:8001/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What was the company revenue?",
    "collection_name": "documents"
  }'
```
Expected: Generated answer based on document
- [ ] Answer contains revenue information
- [ ] Source count > 0
- [ ] Model name returned

### Test 4: PDF Upload (Full Integration)
Through web UI:
1. Navigate to PDF chat tool
2. Upload test PDF (5-20 pages)
3. Wait for processing (~10-20 seconds)
4. Ask question about PDF content
5. Verify answer is RAG-augmented

- [ ] PDF accepted
- [ ] Processing completed
- [ ] Answer contains relevant information
- [ ] Sources cited in metadata

---

## Performance Validation

### Metrics to Check

| Metric | Target | Actual | ✅ |
|--------|--------|--------|-----|
| Embedding/chunk | <500ms | ___ | [ ] |
| ChromaDB query | <200ms | ___ | [ ] |
| LLM response | <10s | ___ | [ ] |
| Total RAG query | <15s | ___ | [ ] |
| Chunking | <100ms | ___ | [ ] |

### Load Testing
```bash
# Test with larger PDF (20-50 MB)
# Monitor memory usage
# Check response times
# Verify no crashes
```

- [ ] Large PDFs processed (no hanging)
- [ ] Memory stable (no leaks)
- [ ] Response times acceptable
- [ ] No service crashes

---

## Security Checklist

### Data Privacy
- [x] Per-user collections enforced
- [x] User ID in all metadata
- [x] No cross-user data access
- [x] Audit trail enabled

### Network Security
- [ ] CORS configured correctly
- [ ] Only allow trusted origins
- [ ] JWT tokens validated
- [ ] No credentials in logs

### Data Protection
- [ ] PostgreSQL password strong
- [ ] ChromaDB access restricted
- [ ] Regular backups scheduled
- [ ] Disaster recovery tested

---

## Monitoring Setup

### Logs to Monitor
```bash
# Backend logs
npm run dev --output logs/backend.log

# LLM service logs
python -m uvicorn app.main:app > logs/llm.log 2>&1

# Docker logs
docker logs -f karyoai_chroma
docker logs -f karyoai_ollama
```

- [ ] Error logs empty
- [ ] Warning logs reviewed
- [ ] Performance logs tracked
- [ ] Fallback usage monitored

### Metrics to Track
- [ ] RAG query latency (target: <15s)
- [ ] Embedding generation time
- [ ] ChromaDB collection size
- [ ] Fallback rate (target: <1%)
- [ ] Error rate (target: 0%)

---

## Rollback Plan (If Needed)

If RAG causes issues:

### Option 1: Disable RAG (5 seconds)
```env
USE_RAG=false
```
Restart services. System falls back to context window approach.

### Option 2: Reset Database (2 minutes)
```bash
cd backend
npx prisma migrate resolve --skip-apply
npm run db:migrate
```

### Option 3: Full Rollback (5 minutes)
```bash
# Revert file changes
git checkout backend/prisma/schema.prisma
git checkout backend/src/controllers/pdf/pdfChatAgentController.ts
git checkout llm-service/llm-ms/app/main.py

# Reset database
npx prisma migrate reset

# Restart
docker compose restart
```

---

## Post-Deployment

### Documentation
- [ ] Team briefed on RAG capabilities
- [ ] RAG_QUICK_START.md shared
- [ ] Configuration documented
- [ ] Troubleshooting guide available

### Monitoring
- [ ] Logs collected daily
- [ ] Performance baseline set
- [ ] Alerts configured
- [ ] Team on-call ready

### User Communication
- [ ] Users notified of new RAG feature
- [ ] Feature availability documented
- [ ] Support trained on RAG
- [ ] Feedback channels open

### Analytics
- [ ] RAG usage tracked
- [ ] Quality metrics baseline
- [ ] Cost savings measured
- [ ] User satisfaction surveyed

---

## Success Criteria

✅ **Deployment Successful When:**

1. **All Services Running**
   - [ ] Backend: 3000 ✅
   - [ ] LLM Service: 8001 ✅
   - [ ] Frontend: 5173 ✅
   - [ ] PostgreSQL: 5432 ✅
   - [ ] ChromaDB: 8000 ✅
   - [ ] Ollama: 18080 ✅

2. **All Tests Passing**
   - [ ] Ingestion test passed
   - [ ] Retrieval test passed
   - [ ] RAG query test passed
   - [ ] PDF chat test passed

3. **Performance Acceptable**
   - [ ] Query latency <15s
   - [ ] Embedding <500ms
   - [ ] Search <200ms
   - [ ] Fallback rate <1%

4. **Data Integrity**
   - [ ] No data loss
   - [ ] User isolation verified
   - [ ] Metadata complete
   - [ ] Backups scheduled

5. **No Regressions**
   - [ ] Existing PDF chat works
   - [ ] Other modules unaffected
   - [ ] Error rate at baseline
   - [ ] Performance baseline met

---

## Contacts & Escalation

| Issue | Contact | Response |
|-------|---------|----------|
| Database error | DBA | 30min |
| Service down | DevOps | 15min |
| Data corruption | Security | 1hr |
| Performance | Dev Lead | 2hr |
| User report | Support | 4hr |

---

## Sign-Off

- [ ] QA Lead: ___________ Date: ___
- [ ] Dev Lead: ___________ Date: ___
- [ ] DevOps: ___________ Date: ___
- [ ] Security: ___________ Date: ___
- [ ] Product: ___________ Date: ___

---

## Notes

```
_________________________________________________________________

_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

---

**Deployment Status**: ⏳ Ready to Deploy

**Next Step**: Run `npm run db:migrate` and set `USE_RAG=true`

**Expected Duration**: 5 minutes

**Go/No-Go Decision**: ______________________

**Deployment Date**: _______________________

---

*Last Updated: February 20, 2026*

import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, Header, Depends
from pydantic import BaseModel
from langchain_community.document_loaders import PyMuPDFLoader
from app.services.rag_service import rag_service

router = APIRouter()

INTERNAL_SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN", "default-dev-token")

class IngestPayload(BaseModel):
    documentId: int
    workspaceId: int
    fileName: str

def verify_token(x_internal_token: str = Header(...)):
    if x_internal_token != INTERNAL_SERVICE_TOKEN:
        raise HTTPException(status_code=403, detail="Unauthorized")

@router.post("/ingest")
async def ingest_document_internal(
    payload: IngestPayload,
    token: str = Depends(verify_token)
):
    current_dir = Path(__file__).resolve().parent
    # llm-service/llm-ms/app/routes -> workspace_root
    workspace_root = current_dir.parent.parent.parent.parent
    uploads_dir = workspace_root / "backend" / "uploads"
    
    target_path = uploads_dir / payload.fileName
    
    print(f"Computed Target Path: {target_path}")
    
    if not target_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"File not found: {target_path}"
        )
        
    try:
        loader = PyMuPDFLoader(str(target_path))
        docs = loader.load()
        
        # Combine all pages into a single document_text
        document_text = "\n\n".join([doc.page_content for doc in docs])
        
        metadata = {
            "documentId": str(payload.documentId),
            "workspaceId": str(payload.workspaceId),
            "fileName": payload.fileName
        }
        
        result = await rag_service.ingest_document(
            document_id=str(payload.documentId),
            document_text=document_text,
            metadata=metadata,
            collection_name="documents"
        )
        
        return {
            "status": "success",
            "documentId": payload.documentId,
            "totalChunks": result.get("chunk_count", 0)
        }
    except Exception as e:
        print(f"Ingestion Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

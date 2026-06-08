import os
from fastapi import FastAPI, HTTPException, Header, Depends
from pydantic import BaseModel
import chromadb
from langchain_community.document_loaders import PyMuPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

app = FastAPI()

# Database connections
CHROMA_HOST = os.getenv("CHROMA_HOST", "chromadb")
CHROMA_PORT = int(os.getenv("CHROMA_PORT", 8000))
INTERNAL_SERVICE_TOKEN = os.getenv("INTERNAL_SERVICE_TOKEN", "default-dev-token")

# Chroma client
chroma_client = chromadb.HttpClient(
    host=CHROMA_HOST,
    port=CHROMA_PORT
)

# TEMPORARY: create collection WITHOUT Ollama embeddings
collection = chroma_client.get_or_create_collection(
    name="documents"
)

class IngestPayload(BaseModel):
    documentId: int
    workspaceId: int
    fileName: str

def verify_token(x_internal_token: str = Header(...)):
    if x_internal_token != INTERNAL_SERVICE_TOKEN:
        raise HTTPException(status_code=403, detail="Unauthorized")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/internal/documents/ingest")
def ingest_document(
    payload: IngestPayload,
    token: str = Depends(verify_token)
):
    print("==============================")
    print("FASTAPI INGESTION RECEIVED")
    print(f"Payload: {payload}")
    print("==============================")

    target_path = os.path.join("/app/uploads", payload.fileName)
    print(f"Computed Target Path: {target_path}")

    if not os.path.exists(target_path):
        raise HTTPException(
            status_code=404,
            detail=f"File not found: {target_path}"
        )

    collection.delete(
        where={"documentId": str(payload.documentId)}
    )

    loader = PyMuPDFLoader(target_path)
    docs = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )

    chunks = splitter.split_documents(docs)

    ids = []
    documents = []
    metadatas = []

    for i, chunk in enumerate(chunks):
        ids.append(f"doc_{payload.documentId}_chunk_{i}")
        documents.append(chunk.page_content)

        metadatas.append({
            "documentId": str(payload.documentId),
            "workspaceId": str(payload.workspaceId),
            "chunkNumber": i,
            "fileName": payload.fileName
        })

    if documents:
        collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )

    return {
        "status": "success",
        "documentId": payload.documentId,
        "totalChunks": len(chunks)
    }
/**
 * RAG Service - Backend integration with RAG pipeline
 * Handles document ingestion, management, and retrieval
 */

import axios, { AxiosInstance } from 'axios';

interface IngestDocumentRequest {
  documentId: string;
  documentText: string;
  metadata?: Record<string, any>;
  collectionName?: string;
}

interface IngestDocumentResponse {
  status: string;
  documentId: string;
  chunkCount: number;
  collectionId: string;
}

interface IngestDocumentApiResponse {
  status: string;
  document_id: string;
  chunk_count: number;
  collection_id: string;
}

interface RetrieveContextResponse {
  chunks: Array<{
    rankNumber: number;
    chunkId: string;
    documentId: string;
    chunkNumber: number;
    text: string;
    distance: number;
    similarity: number;
    metadata: Record<string, any>;
  }>;
  sourceCount: number;
}

interface RetrieveContextApiResponse {
  chunks: Array<{
    rank: number;
    chunk_id: string;
    document_id: string;
    chunk_number: number;
    text: string;
    distance: number;
    similarity: number;
    metadata: Record<string, any>;
  }>;
  source_count: number;
}

interface RAGQueryRequest {
  query: string;
  collectionName?: string;
  nContextChunks?: number;
  temperature?: number;
  maxTokens?: number;
}

interface RAGQueryResponse {
  answer: string;
  context: Array<{
    rankNumber: number;
    chunkId: string;
    documentId: string;
    chunkNumber: number;
    text: string;
    similarity: number;
    metadata: Record<string, any>;
  }>;
  sourceCount: number;
  model: string;
}

interface RAGQueryApiResponse {
  answer: string;
  context: Array<{
    rank: number;
    chunk_id: string;
    document_id: string;
    chunk_number: number;
    text: string;
    similarity: number;
    metadata: Record<string, any>;
  }>;
  source_count: number;
  model: string;
}

const RAG_SERVICE_URL = process.env.RAG_SERVICE_URL || process.env.LLM_SERVICE_URL || 'http://localhost:8001';

class RAGService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${RAG_SERVICE_URL}/api/rag`,
      timeout: 60000, // 1 minute for document processing
    });
  }

  /**
   * Ingest a document into the RAG system
   * 
   * @param request - Document ingestion request
   * @returns Ingestion result with chunk count
   */
  async ingestDocument(request: IngestDocumentRequest): Promise<IngestDocumentResponse> {
    try {
      console.log(`📥 Ingesting document: ${request.documentId}`);
      
      const response = await this.client.post<IngestDocumentApiResponse>('/ingest', {
        document_id: request.documentId,
        document_text: request.documentText,
        metadata: request.metadata,
        collection_name: request.collectionName || 'documents',
      });

      const mappedResponse: IngestDocumentResponse = {
        status: response.data.status,
        documentId: response.data.document_id,
        chunkCount: response.data.chunk_count,
        collectionId: response.data.collection_id,
      };

      console.log(`✅ Document ingested: ${mappedResponse.chunkCount} chunks`);
      return mappedResponse;
    } catch (error: any) {
      console.error('❌ Document ingestion failed:', error.message);
      throw new Error(`Failed to ingest document: ${error.message}`);
    }
  }

  /**
   * Retrieve relevant context for a query
   * 
   * @param query - Search query
   * @param collectionName - Collection to search
   * @param nResults - Number of results to retrieve
   * @returns Relevant document chunks
   */
  async retrieveContext(
    query: string,
    collectionName: string = 'documents',
    nResults: number = 5
  ): Promise<RetrieveContextResponse> {
    try {
      console.log(`🔍 Retrieving context for: "${query}"`);
      
      const response = await this.client.post<RetrieveContextApiResponse>('/retrieve', {
        query,
        collection_name: collectionName,
        n_results: nResults,
      });

      const mappedResponse: RetrieveContextResponse = {
        chunks: response.data.chunks.map((chunk) => ({
          rankNumber: chunk.rank,
          chunkId: chunk.chunk_id,
          documentId: chunk.document_id,
          chunkNumber: chunk.chunk_number,
          text: chunk.text,
          distance: chunk.distance,
          similarity: chunk.similarity,
          metadata: chunk.metadata,
        })),
        sourceCount: response.data.source_count,
      };

      console.log(`✅ Retrieved ${mappedResponse.sourceCount} chunks`);
      return mappedResponse;
    } catch (error: any) {
      console.error('❌ Context retrieval failed:', error.message);
      throw new Error(`Failed to retrieve context: ${error.message}`);
    }
  }

  /**
   * Execute RAG query: retrieve context and generate answer
   * 
   * @param request - RAG query request
   * @returns Generated answer with source context
   */
  async ragQuery(request: RAGQueryRequest): Promise<RAGQueryResponse> {
    try {
      console.log(`🤖 RAG Query: "${request.query}"`);
      
      const response = await this.client.post<RAGQueryApiResponse>('/query', {
        query: request.query,
        collection_name: request.collectionName || 'documents',
        n_context_chunks: request.nContextChunks || 5,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 512,
      });

      const mappedResponse: RAGQueryResponse = {
        answer: response.data.answer,
        context: response.data.context.map((chunk) => ({
          rankNumber: chunk.rank,
          chunkId: chunk.chunk_id,
          documentId: chunk.document_id,
          chunkNumber: chunk.chunk_number,
          text: chunk.text,
          similarity: chunk.similarity,
          metadata: chunk.metadata,
        })),
        sourceCount: response.data.source_count,
        model: response.data.model,
      };

      console.log(`✅ Answer generated using ${mappedResponse.sourceCount} sources`);
      return mappedResponse;
    } catch (error: any) {
      console.error('❌ RAG query failed:', error.message);
      throw new Error(`RAG query failed: ${error.message}`);
    }
  }

  /**
   * Get list of all collections
   * 
   * @returns List of collection names
   */
  async listCollections(): Promise<string[]> {
    try {
      const response = await this.client.get<{ collections: string[] }>('/collections');
      return response.data.collections;
    } catch (error: any) {
      console.error('❌ Failed to list collections:', error.message);
      throw new Error(`Failed to list collections: ${error.message}`);
    }
  }

  /**
   * Get statistics for a collection
   * 
   * @param collectionName - Name of collection
   * @returns Collection statistics
   */
  async getCollectionStats(collectionName: string): Promise<{ name: string; documentCount: number }> {
    try {
      const response = await this.client.get<{ name: string; document_count: number }>(
        `/collection/${collectionName}/stats`
      );
      return {
        name: response.data.name,
        documentCount: response.data.document_count,
      };
    } catch (error: any) {
      console.error('❌ Failed to get collection stats:', error.message);
      throw new Error(`Failed to get collection stats: ${error.message}`);
    }
  }

  /**
   * Check health of RAG system
   * 
   * @returns Health status of RAG components
   */
  async checkHealth(): Promise<{
    status: string;
    chromadb: string;
    embeddingModel: string;
    chunkSize: number;
    chunkOverlap: number;
  }> {
    try {
      const response = await this.client.get<any>('/rag/health');
      return {
        status: response.data.status,
        chromadb: response.data.chromadb,
        embeddingModel: response.data.embedding_model,
        chunkSize: response.data.chunk_size,
        chunkOverlap: response.data.chunk_overlap,
      };
    } catch (error: any) {
      console.error('❌ RAG health check failed:', error.message);
      throw new Error(`RAG health check failed: ${error.message}`);
    }
  }
}

// Export singleton instance
export default new RAGService();

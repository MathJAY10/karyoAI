import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import prisma from '../lib/prisma';
import { INGESTION_QUEUE_NAME } from '../config/bullmq';
import path from 'path';

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8001/internal/documents/ingest';
console.log("🚀 Ingestion Worker Booting...");
console.log("Queue Name:", INGESTION_QUEUE_NAME);
export const ingestionWorker = new Worker(
  INGESTION_QUEUE_NAME,
  async (job: Job) => {
     console.log("📄 JOB RECEIVED:", job.id, job.data);

    const { documentId } = job.data;

    // 1. Update status to PROCESSING
    const doc = await prisma.document.update({
      where: { id: documentId },
      data: { status: 'PROCESSING' }
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 540000); // 9 minutes timeout

      if (!doc.filePath) throw new Error("Document has no filePath");

      // Cross-platform filename extraction (handles both / and \)
      const computedFileName = doc.filePath.split(/[\/\\]/).pop();
      console.log('Document ID:', documentId);
      console.log('Original FilePath:', doc.filePath);
      console.log('Computed FileName:', computedFileName);

      // 2. Call FastAPI internal endpoint
      const response = await fetch(FASTAPI_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN || 'default-dev-token'
        },
        body: JSON.stringify({
          documentId: doc.id,
          workspaceId: doc.workspaceId,
          fileName: computedFileName
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FastAPI Error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      // 3. Update status to READY on success
      await prisma.document.update({
        where: { id: documentId },
        data: { 
          status: 'READY',
          totalChunks: result.totalChunks 
        }
      });

      return result;
    } catch (error) {
      console.error(`Error processing document ${documentId}:`, error);
      throw error; 
    }
  },
  {
    connection: redisConnection as any,
    concurrency: 1,
    lockDuration: 600000,
  }
);

// 4. Update status to FAILED only after retries exhausted
ingestionWorker.on('failed', async (job: Job | undefined, err: Error) => {
  if (job && job.attemptsMade === (job.opts.attempts || 3)) {
    try {
      await prisma.document.update({
        where: { id: job.data.documentId },
        data: { 
          status: 'FAILED',
          errorMessage: err.message
        }
      });
      console.log(`Document ${job.data.documentId} marked as FAILED after exhausting retries.`);
    } catch (dbError) {
      console.error(`Failed to update DB status to FAILED for document ${job.data.documentId}:`, dbError);
    }
  }
});

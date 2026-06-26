import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { MEMORY_EXTRACTION_QUEUE_NAME } from '../config/bullmq';
import axios from 'axios';
import prisma from '../lib/prisma';

const LLM_SERVICE_URL = process.env.LLM_SERVICE_URL || 'http://localhost:8005';

export const memoryWorker = new Worker(
  MEMORY_EXTRACTION_QUEUE_NAME,
  async (job: Job) => {
    const { sessionId, userId, type } = job.data;
    console.log(`[MEMORY_WORKER_START] sessionId: ${sessionId}, userId: ${userId}`);
    console.log(`[MemoryWorker] Starting extraction for session ${sessionId}, user ${userId}, type ${type}`);

    try {
      // 1. Fetch Chat History from Prisma
      let messages: { sender: string; content: string }[] = [];

      if (type === 'ai_workmate') {
        const history = await prisma.chatMessage.findMany({
          where: { chatId: Number(sessionId) },
          orderBy: { createdAt: 'desc' },
          take: 20
        });
        messages = history.reverse().map(h => ({ sender: h.sender, content: h.content }));
      } else {
        // PDF Chat uses `message` table
        const history = await prisma.message.findMany({
          where: { sessionId: Number(sessionId) },
          orderBy: { createdAt: 'desc' },
          take: 20
        });
        messages = history.reverse().map(h => ({ sender: h.sender, content: h.content }));
      }

      // Format them into a simple text block
      const conversationContext = messages
        .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n\n');

      if (!conversationContext) {
        console.log(`[MemoryWorker] No messages found for session ${sessionId}, skipping.`);
        return;
      }
      console.log(`[MEMORY_CONTEXT_LENGTH] ${conversationContext.length}`);

      // 2. Call FastAPI for Extraction
      const response = await axios.post(`${LLM_SERVICE_URL}/internal/memory/extract`, {
        sessionId,
        userId,
        conversationContext,
      });

      // 3. Save novel facts back to Prisma
      console.log(`[MEMORY_EXTRACT_RESPONSE] Extracted facts count: ${response.data.novelFacts?.length || 0}`);
      const novelFacts = response.data.novelFacts || [];
      for (const fact of novelFacts) {
        console.log(`[MEMORY_FACT_INSERT] content: "${fact.content}", memoryType: "${fact.type}"`);
        const memoryFact = await prisma.memoryFact.create({
          data: {
            userId: Number(userId),
            memoryType: fact.type,
            content: fact.content,
            sourceChatSessionId: Number(sessionId),
            embeddingStatus: 'PENDING'
          }
        });
        console.log(`[MEMORY_FACT_INSERT] id: ${memoryFact.id}, memoryType: "${memoryFact.memoryType}", embeddingStatus: "${memoryFact.embeddingStatus}"`);

        // 4. Send the ID back to FastAPI to store in ChromaDB metadata
        try {
          console.log(`[MEMORY_EMBED_REQUEST] Sending request for fact ${memoryFact.id}`);
          await axios.post(`${LLM_SERVICE_URL}/internal/memory/embed`, {
            memoryFactId: memoryFact.id,
            userId,
            sessionId,
            content: fact.content,
            memoryType: fact.type
          });

          console.log(`[MEMORY_EMBED_SUCCESS] memoryFactId: ${memoryFact.id}, memoryType: "${fact.type}"`);

          // 5. Update Postgres on Success
          await prisma.memoryFact.update({
            where: { id: memoryFact.id },
            data: { embeddingStatus: 'INDEXED' }
          });
          console.log(`[MEMORY_SUCCESS] Successfully indexed fact ${memoryFact.id} of type ${fact.type}`);
        } catch (embedError: any) {
          console.error(`[MEMORY_EMBED_FAILED] memoryFactId: ${memoryFact.id}, memoryType: "${fact.type}" - error: ${embedError.message}`);
          console.error(`[CRITICAL] ChromaDB insertion failed for fact ${memoryFact.id}:`, embedError.message);
          
          // 6. Mark as FAILED in Postgres (do not crash worker)
          await prisma.memoryFact.update({
            where: { id: memoryFact.id },
            data: { embeddingStatus: 'FAILED' }
          });
        }
      }

      console.log(`[MEMORY_WORKER] Extraction complete. Saved ${novelFacts.length} new facts.`);
      return response.data;
    } catch (error: any) {
      console.error(
        `[MemoryWorker] Error during extraction for session ${sessionId}:`,
        error.response?.data || error.message
      );
      throw error;
    }
  },
  {
    connection: redisConnection as any,
    concurrency: 2, // Limit concurrency for heavy LLM operations
  }
);

memoryWorker.on('completed', (job) => {
  console.log(`Job ${job.id} has completed!`);
});

memoryWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} has failed with ${err.message}`);
});

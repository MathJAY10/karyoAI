import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { DISCUSSION_QUEUE_NAME } from '../config/bullmq';
import prisma from '../lib/prisma';
import axios from 'axios';

const LLM_SERVICE_URL = process.env.LLM_SERVICE_URL || 'http://localhost:8001';

export const discussionWorker = new Worker(
  DISCUSSION_QUEUE_NAME,
  async (job: Job) => {
    const { sessionId, sourceType } = job.data;
    console.log(`[DISCUSSION_WORKER_START] Starting summary for session ${sessionId}`);

    try {
      // 1. Load Session Metadata & Messages
      let workspaceId: number | null = null;
      let documentId: number | null = null;
      let userId: number;
      let messages: { sender: string; content: string; createdAt: Date }[] = [];

      if (sourceType === 'pdf_chat') {
        const session = await prisma.chatSession.findUnique({
          where: { id: sessionId },
          include: {
            workspace: true,
            documents: true,
            messages: { orderBy: { createdAt: 'asc' } }
          }
        });

        if (!session) {
          throw new Error(`ChatSession ${sessionId} not found`);
        }
        
        workspaceId = session.workspaceId;
        userId = session.workspace.userId;
        documentId = session.documents[0]?.documentId || null;
        messages = session.messages.map(m => ({
          sender: m.sender,
          content: m.content,
          createdAt: m.createdAt
        }));
      } else {
        throw new Error(`Unsupported sourceType: ${sourceType}`);
      }

      if (messages.length === 0) {
        console.log(`[DISCUSSION_WORKER_SKIP] No messages found for session ${sessionId}`);
        return { status: 'skipped', reason: 'no messages' };
      }

      // 2. Build Transcript
      const transcript = messages
        .map(m => `${m.sender === 'user' ? 'Human' : 'Assistant'}: ${m.content}`)
        .join('\n\n');

      console.log(`[DISCUSSION_CONTEXT_LENGTH] Session ${sessionId} has ${messages.length} messages`);

      // 3. Call Python summarizer endpoint
      console.log(`[DISCUSSION_EMBED_REQUEST] Calling python summarizer for session ${sessionId}`);
      const pythonResponse = await axios.post(`${LLM_SERVICE_URL}/internal/discussions/summarize`, {
        session_id: sessionId,
        workspace_id: workspaceId,
        document_id: documentId,
        user_id: userId,
        source_type: sourceType,
        transcript: transcript
      });

      const { topic, summary, keyPoints, embedding_status } = pythonResponse.data;
      console.log(`[DISCUSSION_SUMMARY_RESPONSE] Topic: ${topic}`);

      // 4. Upsert Postgres ChatDiscussion
      const lastMessageAt = messages[messages.length - 1].createdAt;

      const chatDiscussion = await prisma.chatDiscussion.upsert({
        where: { sessionId: sessionId },
        update: {
          topic,
          summary,
          keyPoints,
          messageCount: messages.length,
          lastMessageAt,
          embeddingStatus: embedding_status
        },
        create: {
          userId,
          workspaceId,
          sessionId,
          documentId,
          sourceType,
          topic,
          summary,
          keyPoints,
          messageCount: messages.length,
          lastMessageAt,
          embeddingStatus: embedding_status
        }
      });

      console.log(`[DISCUSSION_UPSERT] Success for session ${sessionId}, DB ID: ${chatDiscussion.id}`);
      return { status: 'success', discussionId: chatDiscussion.id };

    } catch (error) {
      console.error(`[DISCUSSION_FAILED] Failed to process session ${sessionId}:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection as any,
    concurrency: 2,
  }
);

discussionWorker.on('completed', (job) => {
  console.log(`[DISCUSSION_SUCCESS] Job ${job.id} completed successfully`);
});

discussionWorker.on('failed', (job, err) => {
  console.error(`[DISCUSSION_FAILED] Job ${job?.id} failed with error:`, err);
});

import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import ragService from '../../services/ragService';
import { memoryQueue, discussionQueue } from '../../config/bullmq';

export const chatWithPDF = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated. Please log in.' });
    }
    
    const { documentId, question, sessionId } = req.body;
    
    if (!documentId) {
      return res.status(400).json({ error: 'No documentId provided' });
    }
    
    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'No question provided' });
    }
    
    // 1. Verify Document
    const document = await prisma.document.findUnique({
      where: { id: Number(documentId) }
    });
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    if (document.userId !== userId) {
      return res.status(403).json({ error: 'Access denied to this document' });
    }

    if (!document.workspaceId) {
      return res.status(400).json({ error: 'Document must belong to a workspace to start a chat session' });
    }
    
    if (document.status !== 'READY') {
      return res.status(400).json({ error: `Document is not ready for querying. Current status: ${document.status}` });
    }
    
    // 2. Handle Chat Session
    let currentSessionId = sessionId ? Number(sessionId) : null;
    let messages: any[] = [];
    
    if (currentSessionId) {
      // Validate existing session
      const session = await prisma.chatSession.findUnique({
        where: { id: currentSessionId },
        include: { workspace: true, messages: { orderBy: { createdAt: 'asc' } } }
      });
      
      if (!session) {
        return res.status(404).json({ error: 'Chat session not found' });
      }
      
      if (session.workspace.userId !== userId) {
        return res.status(403).json({ error: 'Access denied to this chat session' });
      }
      
      messages = session.messages;
    } else {
      // Create new session
      const newSession = await prisma.chatSession.create({
        data: {
          workspaceId: document.workspaceId,
          title: `Chat about ${document.fileName || 'Document'}`,
          documents: {
            create: {
              documentId: document.id
            }
          }
        }
      });
      currentSessionId = newSession.id;
    }
    
    // Save User Message
    await prisma.message.create({
      data: {
        sessionId: currentSessionId,
        sender: 'user',
        content: question
      }
    });
    
    // 3. Prepare Context from History
    // Format previous messages to pass into the prompt
    let conversationHistory = "";
    if (messages.length > 0) {
      conversationHistory = "Previous Conversation:\n" + messages.map(m => `${m.sender === 'user' ? 'Human' : 'Assistant'}: ${m.content}`).join('\n') + "\n\n";
    }
    
    const finalQuery = conversationHistory 
      ? `${conversationHistory}Current Question: ${question}\n\nPlease answer the current question based on the provided context, keeping in mind the previous conversation if relevant.`
      : question;
    
    // 4. Query RAG Service with strict filtering
    try {
      const collectionName = 'documents';
      const metadataFilter = { documentId: String(documentId) };

      console.log(`🤖 RAG Query for Document ${documentId}`);
      console.log("Collection:", collectionName);
      console.log("Document:", documentId);
      console.log("Filter:", metadataFilter);
      
      const ragResult = await ragService.ragQuery({
        query: finalQuery,
        collectionName,
        nContextChunks: 5,
        temperature: 0.7,
        maxTokens: 512,
        metadataFilter
      });
      
      if (!ragResult.context || ragResult.context.length === 0) {
        // Warning: The query succeeded but 0 chunks matched.
        console.warn(`⚠️ RAG retrieved 0 chunks for documentId ${documentId}. Ensure the document was properly ingested.`);
      }
      
      // Save Assistant Message
      await prisma.message.create({
        data: {
          sessionId: currentSessionId,
          sender: 'bot',
          content: ragResult.answer
        }
      });
      
      // Enqueue a debounced rolling summary job for this PDF chat session
      try {
        // (Using static discussionQueue import from top of file)
        const jobId = `discussion_summary_session_${currentSessionId}`;
        
        // Add job with a 3-minute delay. If a job with this ID already exists (from a previous message),
        // we can remove it and re-add to reset the debounce timer, or just let it run. 
        // BullMQ doesn't natively "reset" delays on same jobId if it's delayed, so we remove and re-add.
        await discussionQueue.remove(jobId);
        
        await discussionQueue.add(
          'summarize-pdf-chat',
          {
            sessionId: currentSessionId,
            sourceType: 'pdf_chat'
          },
          {
            jobId,
            delay: 3 * 60 * 1000, // 3 minutes debounce
          }
        );
        console.log(`[DISCUSSION_QUEUE] Debounced summary job ${jobId} for 3 minutes`);
      } catch (queueError) {
        console.error('Failed to enqueue discussion summary job:', queueError);
      }
      
      // 5. Memory Extraction Disabled for PDF Chat
      // We no longer extract memory from PDF chats to prevent
      // document facts from overriding personal user profiles.
      
      // Update user limit
      try {
        const token = req.headers.authorization?.split(' ')[1];
        if (token) {
          await fetch(`${process.env.BACKEND_URL || 'http://localhost:5000'}/api/user/update-limit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ limitType: 'message' })
          });
        }
      } catch (limitError) {
        console.error('Failed to update user limit:', limitError);
      }
      
      return res.json({ 
        sessionId: currentSessionId, 
        answer: ragResult.answer,
        sources: ragResult.context
      });
      
    } catch (ragError) {
      console.error('❌ RAG query failed:', ragError);
      return res.status(503).json({
        error: 'RAG query failed',
        detail: process.env.NODE_ENV === 'development' && ragError instanceof Error ? ragError.message : undefined
      });
    }
    
  } catch (err) {
    console.error('❌ PDF chat request failed:', err);
    res.status(500).json({
      error: 'Failed to process PDF chat request',
      detail: process.env.NODE_ENV === 'development' && err instanceof Error ? err.message : undefined
    });
  }
};

export const getPDFChatById = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const session = await prisma.chatSession.findUnique({
      where: { id: Number(sessionId) },
      include: {
        workspace: true,
        messages: { orderBy: { createdAt: 'asc' } }
      }
    });
    
    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }
    
    if (session.workspace.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ sessionId: session.id, messages: session.messages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
};
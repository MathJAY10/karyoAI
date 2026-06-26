import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import path from 'path';
import fs from 'fs';
import { llmService } from '../../services/llmService';
import { memoryQueue } from '../../config/bullmq';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB, similar to ChatGPT free tier

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    let { chatId, message } = req.body;
    let fileUrl = '';
    
    if (req.file) {
      if (req.file.size > MAX_FILE_SIZE) {
        return res.status(400).json({ error: 'File too large' });
      }
      // Save file securely (assume uploads/ exists and is not public)
      const uploadPath = path.join(__dirname, '../../../uploads', req.file.filename);
      fs.writeFileSync(uploadPath, req.file.buffer);
      fileUrl = `/uploads/${req.file.filename}`;
    }
    
    // If no chatId or chat does not exist, create a new chat session
    let chatSessionId = chatId;
    if (!chatSessionId) {
      const chat = await prisma.chat.create({
        data: { 
          userId: userId, 
          toolType: 'ai_workmate', // Use this ToolType for AI Workmate
          title: message?.slice(0, 30) || 'New Chat' 
        }
      });
      chatSessionId = chat.id;
    }
    
    // Save user message
    await prisma.chatMessage.create({
      data: {
        chatId: Number(chatSessionId),
        sender: 'user',
        content: message + (fileUrl ? ` [file: ${fileUrl}]` : ''),
      }
    });
    
    // Fetch full chat history for context
    const history = await prisma.chatMessage.findMany({
      where: { chatId: Number(chatSessionId) },
      orderBy: { createdAt: 'asc' }
    });
    
    // Build conversation context for LLM
    const conversationContext = history
      .filter((msg: any) => msg.sender === 'user' || msg.sender === 'bot')
      .map((msg: any) => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');
    
    // Import memoryService (ensure it is imported at the top)
    const { memoryService } = require('../../services/memoryService');
    
    // INTENT ROUTING (Regex-based)
    const msgLower = message.toLowerCase();
    let aiMessage = '';
    
    const listRegex = /(?:what topics have we discussed|what do you know about me|what have we talked about recently)/i;
    const summarizeRegex = /(?:what have i learned|what did i learn|summarize my learnings) (?:about|on) (.+?)(?:\?|$)/i;
    const searchRegex = /(?:did we discuss|have we discussed|have we talked about|do you remember|what did i discuss about|tell me about my previous discussion on|what discussion did i do on) (.+?)(?:\?|$)/i;

    const listMatch = msgLower.match(listRegex);
    const sumMatch = msgLower.match(summarizeRegex);
    const searchMatch = msgLower.match(searchRegex);

    // 1. LIST_TOPICS
    if (listMatch) {
      console.log(`[MEMORY_ROUTE] LIST_TOPICS`);
      aiMessage = await memoryService.listKnownTopics(userId);
    }
    // 2. SUMMARIZE_TOPIC
    else if (sumMatch) {
      const topic = sumMatch[1].trim();
      console.log(`[MEMORY_ROUTE] SUMMARIZE_TOPIC | Topic: "${topic}"`);
      aiMessage = await memoryService.summarizeLearnings(topic, userId);
    }
    // 3. SEARCH_MEMORY
    else if (searchMatch) {
      const topic = searchMatch[1].trim();
      console.log(`[MEMORY_ROUTE] SEARCH_MEMORY | Topic: "${topic}"`);
      
      const memories = await memoryService.searchMemory(topic, userId);
      let memoryContext = '';
      if (!memories || memories.length === 0) {
        console.log(`[MEMORY_EMPTY] No memories found`);
        memoryContext = 'Relevant Memories:\n* None found.';
      } else {
        console.log(`[MEMORY_INJECTION] Injecting memories into prompt`);
        memoryContext = `Relevant Memories:\n${memories.map((m: any, i: number) => `* ${m}`).join('\n')}`;
      }

      console.log(`[MEMORY_CONTEXT_DUMP]\n${memoryContext}`);

      const activeWorkspace = await prisma.workspace.findFirst({
        where: { userId },
        include: { documents: true }
      });
      let workspaceContext = '';
      if (activeWorkspace) {
        const docNames = activeWorkspace.documents.map((d: any) => d.fileName).join(', ');
        workspaceContext = `\nCurrent Workspace ID: ${activeWorkspace.id}\nAvailable Uploaded Documents: ${docNames || 'None'}`;
      }

      const systemPrompt = `You are AI Workmate, a helpful and knowledgeable assistant. 
Provide accurate, clear, and useful responses to help users with their tasks, questions, and projects.

Instructions:
Use memories only if relevant.
Do not invent memories.
If no memory exists, say so.
If you need to search past discussions, use your chat discussion recall tool with the Current Workspace ID.
${workspaceContext}

${memoryContext}`;

      const userPrompt = conversationContext 
        ? `${conversationContext}\n\nUser: ${message}\n\nProvide a helpful response:`
        : message;
      
      // SEARCH_MEMORY: memory context is already injected — do NOT expose MCP tools
      // to prevent the model from leaking tool-call JSON into content.
      aiMessage = await llmService.simpleCompletion(userPrompt, systemPrompt, 0.7, 1000, false);
    }
    // 4. NORMAL CHAT
    else {
      console.log('[INTENT] NORMAL CHAT detected');
      
      const activeWorkspace = await prisma.workspace.findFirst({
        where: { userId },
        include: { documents: true }
      });
      let workspaceContext = '';
      if (activeWorkspace) {
        const docNames = activeWorkspace.documents.map((d: any) => d.fileName).join(', ');
        workspaceContext = `\nCurrent Workspace ID: ${activeWorkspace.id}\nAvailable Uploaded Documents: ${docNames || 'None'}`;
      }

      const systemPrompt = `You are AI Workmate, a helpful and knowledgeable assistant. Provide accurate, clear, and useful responses to help users with their tasks, questions, and projects.
If the user specifically asks to recall past chat discussions or query their memory profile, use the appropriate tools.
For normal knowledge, explanation, architecture, or coding questions, answer directly.
Do NOT output raw JSON, tool schemas, or fake tool payloads to the user under any circumstances.
${workspaceContext}`;
      const userPrompt = conversationContext 
        ? `${conversationContext}\n\nUser: ${message}\n\nProvide a helpful response:`
        : message;
      
      aiMessage = await llmService.simpleCompletion(userPrompt, systemPrompt, 0.7, 1000);
    }
    
    console.log('AI Workmate Response:', aiMessage);
    
    await prisma.chatMessage.create({
      data: {
        chatId: Number(chatSessionId),
        sender: 'bot',
        content: aiMessage,
      }
    });

    // Debounce Memory Extraction Job
    try {
      const jobId = `extract_session_aiworkmate_${chatSessionId}`;
      const existingJob = await memoryQueue.getJob(jobId);
      if (existingJob) {
        await memoryQueue.remove(jobId);
        console.log(`[MEMORY_QUEUE] Job Cancelled: ${jobId}`);
      }
      
      await memoryQueue.add(
        'extract',
        { sessionId: chatSessionId, userId, type: 'ai_workmate' },
        { jobId, delay: 3 * 60 * 1000 } // 3 minutes
      );
      console.log(`[MEMORY_QUEUE] Job Scheduled: ${jobId} (Delay: 180s)`);
    } catch (queueError) {
      console.error('[CRITICAL] Failed to queue memory extraction:', queueError);
    }

    // Update user limit after successful OpenAI response
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
      // Don't fail the request if limit update fails
    }
    
    res.json({ aiMessage, chatId: chatSessionId });
  } catch (err) {
    console.error('sendMessage error:', err);
    if (err instanceof Error) {
      console.error('Stack:', err.stack);
    }
    res.status(500).json({ error: 'AI error', details: err });
  }
};

export const getChatHistory = async (req: Request, res: Response) => {
  try {
    const chatId = Number(req.params.chatId);
    const messages = await prisma.chatMessage.findMany({
      where: {  chatId: chatId },
      orderBy: { createdAt: 'asc' }


    });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch chat history' });
  }
};

export const createChatSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { title } = req.body;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const chat = await prisma.chat.create({
      data: { userId: userId, toolType: 'ai_workmate', title }
    });
    
    res.json({ chatId: chat.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create chat session' });
  }
};

export const listChats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const chats = await prisma.chat.findMany({
      where: { userId: userId, toolType: 'ai_workmate' },
      orderBy: { createdAt: 'desc' }
    });
    
    const chatIds = chats.map((c: any) => c.id);
    
    // Get message counts for each chat
    const messageCounts = await prisma.chatMessage.groupBy({
      by: ['chatId'],
      where: { chatId: { in: chatIds } },
      _count: { chatId: true }
    });
    
    const countMap = messageCounts.reduce((acc: Record<number, number>, item: any) => {
      acc[item.chatId] = item._count.chatId;
      return acc;
    }, {} as Record<number, number>);
    
    const chatsWithCounts = chats.map((chat: any) => ({
      ...chat,
      messageCount: countMap[chat.id] || 0
    }));
    
    res.json(chatsWithCounts);
  } catch (err) {
    console.error('listChats error:', err);
    if (err instanceof Error) {
      console.error('Stack:', err.stack);
    }
    res.status(500).json({ error: 'Could not fetch chat sessions', details: err });
  }
}; 
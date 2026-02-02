import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import path from 'path';
import fs from 'fs';
import { llmService } from '../../services/llmService';

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
    
    // Use self-hosted LLM instead of OpenAI
    const systemPrompt = 'You are AI Workmate, a helpful and knowledgeable assistant. Provide accurate, clear, and useful responses to help users with their tasks, questions, and projects.';
    const userPrompt = conversationContext 
      ? `${conversationContext}\n\nUser: ${message}\n\nProvide a helpful response:`
      : message;
    
    const aiMessage = await llmService.simpleCompletion(
      userPrompt,
      systemPrompt,
      0.7, // temperature - balanced creativity
      1000  // max tokens - enough for detailed responses
    );
    
    console.log('AI Workmate Response:', aiMessage);
    
    await prisma.chatMessage.create({
      data: {
        chatId: Number(chatSessionId),
        sender: 'bot',
        content: aiMessage,
      }
    });

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
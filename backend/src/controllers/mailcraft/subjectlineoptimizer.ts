import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { llmService } from '../../services/llmService';

export const sendSubjectLineChatMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'User not authenticated.' });

    const { message, chatId } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'No message provided' });
    }

    let chat;
    if (chatId) {
      chat = await prisma.subjectLineChat.findUnique({ where: { id: Number(chatId) } });
      if (!chat) return res.status(404).json({ error: 'Chat not found' });
    } else {
      chat = await prisma.subjectLineChat.create({ data: { userId } });
    }

    await prisma.subjectLineChatMessage.create({
      data: { chatId: chat.id, sender: 'user', content: message }
    });

    // Use self-hosted LLM for subject line optimization
    const systemPrompt = 'You are an expert email subject line optimizer. Create compelling, engaging, and click-worthy subject lines.';
    const userPrompt = `Create optimized subject lines for the following request:\n\n${message}\n\nReturn only the optimized subject line(s). If multiple options are requested, provide them in a numbered list.`;
    
    const answer = await llmService.simpleCompletion(
      userPrompt,
      systemPrompt,
      0.9, // temperature - more creative for subject lines
      300  // max tokens - subject lines are short
    );

    await prisma.subjectLineChatMessage.create({
      data: { chatId: chat.id, sender: 'bot', content: answer }
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

    const messages = await prisma.subjectLineChatMessage.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ chat_id: chat.id, messages });
  } catch (err) {
    console.error('Error in sendSubjectLineChatMessage:', err);
    res.status(500).json({ error: 'Failed to process subject line optimization request' });
  }
};

export const getSubjectLineChatById = async (req: Request, res: Response) => {
  try {
    const { chat_id } = req.params;
    const userId = (req as any).user?.id;
    const chat = await prisma.subjectLineChat.findUnique({
      where: { id: Number(chat_id) },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
    if (!chat || chat.userId !== userId) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    res.json({ chat_id, messages: chat.messages });
  } catch (err) {
    console.error('Error in getSubjectLineChatById:', err);
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
};

export const getUserSubjectLineChats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'User not authenticated.' });
    const chats = await prisma.subjectLineChat.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
    res.json({ chats });
  } catch (err) {
    console.error('Error in getUserSubjectLineChats:', err);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
};

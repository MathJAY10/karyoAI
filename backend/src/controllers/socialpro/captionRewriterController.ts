import { Request, Response } from 'express';
import OpenAI from 'openai';
import prisma from '../../lib/prisma';

export const sendCaptionRewriterChatMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'User not authenticated.' });

    const { message, chatId } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'No message provided' });
    }

    let chat;
    if (chatId) {
      chat = await prisma.captionRewriterChat.findUnique({ where: { id: Number(chatId) } });
      if (!chat) return res.status(404).json({ error: 'Chat not found' });
    } else {
      chat = await prisma.captionRewriterChat.create({ 
        data: { userId }
      });
    }

    await prisma.captionRewriterChatMessage.create({
      data: {
        chatId: chat.id,
        sender: 'user',
        content: message
      }
    });

    const prompt = `Rewrite and improve the following social media caption. Make it more engaging, clear, and effective. Return only the improved caption.\n\nCaption:\n${message}`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an expert at rewriting and improving social media captions.' },
        { role: 'user', content: prompt }
      ]
    });

    const answer = response.choices[0].message.content || '';

    await prisma.captionRewriterChatMessage.create({
      data: {
        chatId: chat.id,
        sender: 'bot',
        content: answer
      }
    });

    // Decrement message limit after successful response
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

    const messages = await prisma.captionRewriterChatMessage.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ chat_id: chat.id, messages });
  } catch (err) {
    console.error('Error in sendCaptionRewriterChatMessage:', err);
    res.status(500).json({ error: 'Failed to process caption rewriter request' });
  }
};

export const getCaptionRewriterChatById = async (req: Request, res: Response) => {
  try {
    const chatId = Number(req.params.chat_id);
    const chat = await prisma.captionRewriterChat.findUnique({ where: { id: chatId } });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const messages = await prisma.captionRewriterChatMessage.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ chat_id: chat.id, messages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
};

export const getUserCaptionRewriterChats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'User not authenticated.' });

    const chats = await prisma.captionRewriterChat.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });

    res.json({ chats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
};

export default { sendCaptionRewriterChatMessage, getCaptionRewriterChatById, getUserCaptionRewriterChats };

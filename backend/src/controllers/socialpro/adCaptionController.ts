import { Request, Response } from 'express';
import OpenAI from 'openai';
import prisma from '../../lib/prisma';

export const sendAdCaptionChatMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'User not authenticated.' });

    const { message, chatId, platform, objective, product, tone, audience } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'No message provided' });
    }

    let chat;
    if (chatId) {
      chat = await prisma.adCaptionChat.findUnique({ where: { id: Number(chatId) } });
      if (!chat) return res.status(404).json({ error: 'Chat not found' });
    } else {
      chat = await prisma.adCaptionChat.create({ 
        data: { 
          userId,
          platform: platform || 'Meta',
          objective: objective || null,
          product: product || null,
          tone: tone || null,
          audience: audience || null
        } 
      });
    }

    await prisma.adCaptionChatMessage.create({
      data: {
        chatId: chat.id,
        sender: 'user',
        content: message,
        metadata: { platform, objective, product, tone, audience }
      }
    });

    const prompt = `You are a world-class advertising copywriter.

Platform: ${platform || 'Generic'}
Objective: ${objective || 'Conversion'}
Product/Service: ${product || 'N/A'}
Target Audience: ${audience || 'N/A'}
Tone: ${tone || 'Persuasive'}

Task: Create 3 variations of compelling ad captions with strong hooks and clear CTAs based on the following request. Keep each variation concise and platform-appropriate. Return bullet points.

Request:\n${message}`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an expert ad copywriter focused on conversion.' },
        { role: 'user', content: prompt }
      ]
    });

    const answer = response.choices[0].message.content || '';

    await prisma.adCaptionChatMessage.create({
      data: {
        chatId: chat.id,
        sender: 'bot',
        content: answer,
        metadata: { platform, objective, product, tone, audience }
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

    const messages = await prisma.adCaptionChatMessage.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ chat_id: chat.id, messages });
  } catch (err) {
    console.error('Error in sendAdCaptionChatMessage:', err);
    res.status(500).json({ error: 'Failed to process ad caption request' });
  }
};

export const getAdCaptionChatById = async (req: Request, res: Response) => {
  try {
    const chatId = Number(req.params.chat_id);
    const chat = await prisma.adCaptionChat.findUnique({ where: { id: chatId } });
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const messages = await prisma.adCaptionChatMessage.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ chat_id: chat.id, messages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
};

export const getUserAdCaptionChats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'User not authenticated.' });

    const chats = await prisma.adCaptionChat.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: true }
    });

    res.json({ chats });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
};

export default { sendAdCaptionChatMessage, getAdCaptionChatById, getUserAdCaptionChats };



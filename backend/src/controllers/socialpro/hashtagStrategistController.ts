import { Request, Response } from 'express';
import OpenAI from 'openai';
import prisma from '../../lib/prisma';

export const sendHashtagChatMessage = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'User not authenticated.' });

    const { message, chatId, platform, industry, content } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'No message provided' });
    }

    let chat;
    if (chatId) {
      chat = await prisma.hashtagStrategistChat.findUnique({ where: { id: Number(chatId) } });
      if (!chat) return res.status(404).json({ error: 'Chat not found' });
    } else {
      chat = await prisma.hashtagStrategistChat.create({ 
        data: { 
          userId, 
          platform: platform || 'Instagram',
          industry: industry || null,
          content: content || null
        } 
      });
    }

    // Save user message
    await prisma.hashtagStrategistChatMessage.create({
      data: { 
        chatId: chat.id, 
        sender: 'user', 
        content: message,
        metadata: { platform, industry, content }
      }
    });

    // Compose prompt for OpenAI
    const platformSpecific = platform === 'LinkedIn' 
      ? 'professional hashtags suitable for business networking'
      : 'trending and engaging hashtags for social media';
    
    const industryContext = industry ? ` in the ${industry} industry` : '';
    const contentContext = content ? `\n\nContent context: ${content}` : '';
    
    const prompt = `You are an expert hashtag strategist specializing in ${platform} hashtags. 
    
Generate relevant, trending, and effective hashtags${industryContext} for the following request:

${message}${contentContext}

Requirements:
- Generate 15-20 relevant hashtags
- Mix popular trending hashtags with niche-specific ones
- Include industry-relevant hashtags if applicable
- Use ${platform === 'LinkedIn' ? 'professional' : 'casual'} language
- Group hashtags by category (trending, industry-specific, location-based, etc.)
- Ensure hashtags are currently active and relevant
- Provide a brief explanation for hashtag strategy

Format your response as:
1. Trending Hashtags: [list]
2. Industry-Specific: [list] 
3. Location-Based: [list]
4. Brand/Product: [list]
5. Strategy Explanation: [brief explanation]

Return only the hashtag strategy.`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are an expert hashtag strategist.' },
        { role: 'user', content: prompt }
      ]
    });

    const answer = response.choices[0].message.content || '';

    // Save AI response
    await prisma.hashtagStrategistChatMessage.create({
      data: { 
        chatId: chat.id, 
        sender: 'bot', 
        content: answer,
        metadata: { platform, industry, content }
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
    }

    const messages = await prisma.hashtagStrategistChatMessage.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'asc' }
    });

    res.json({ chat_id: chat.id, messages });
  } catch (err) {
    console.error('Error in sendHashtagChatMessage:', err);
    res.status(500).json({ error: 'Failed to process hashtag request' });
  }
};

export const getHashtagChatById = async (req: Request, res: Response) => {
  try {
    const { chat_id } = req.params;
    const userId = (req as any).user?.id;
    const chat = await prisma.hashtagStrategistChat.findUnique({
      where: { id: Number(chat_id) },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
    if (!chat || chat.userId !== userId) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    res.json({ chat_id, messages: chat.messages });
  } catch (err) {
    console.error('Error in getHashtagChatById:', err);
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
};

export const getUserHashtagChats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'User not authenticated.' });
    const chats = await prisma.hashtagStrategistChat.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
    res.json({ chats });
  } catch (err) {
    console.error('Error in getUserHashtagChats:', err);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
};

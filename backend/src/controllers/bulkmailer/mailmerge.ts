import { Request, Response } from 'express';
import OpenAI from 'openai';
import prisma from '../../lib/prisma';

// POST /merge
export const uploadAndGenerate = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as number | undefined;
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });


    // Try to read prompt from JSON body first, then fallback to query string for robustness
    let { prompt, chatId } = req.body as { prompt?: string; chatId?: string };
    // Debugging logs to help diagnose missing body issues
    console.log('mailmerge incoming headers:', req.headers['content-type']);
    console.log('mailmerge incoming body keys:', Object.keys(req.body || {}));
    if ((!prompt || typeof prompt !== 'string') && req.query && (req.query.prompt || (req.query as any).p)) {
      prompt = String(req.query.prompt || (req.query as any).p);
      console.log('mailmerge prompt recovered from query');
    }

    if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Prompt is required' });

    let chat = null as { id: number } | null;
    if (chatId) {
      chat = await prisma.mailMergeAIChat.findUnique({ where: { id: Number(chatId) } });
      if (!chat) return res.status(404).json({ error: 'Chat not found' });
    } else {
      chat = await prisma.mailMergeAIChat.create({ data: { userId } });
    }

    // Save user message
    await prisma.mailMergeAIChatMessage.create({ data: { chatId: chat!.id, sender: 'user', content: prompt } });

    // Construct OpenAI prompt
    const system = 'You are a senior email copywriter. The user will paste two emails in the prompt. Your job is to intelligently detect and merge the two emails into a single, concise, professional, and contextually accurate email. Use the user prompt for guidance. Do not leak raw input, just return the merged email.';
    const userContent = prompt;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent }
      ],
      temperature: 0.3,
      max_tokens: 1024,
    });

    const answer = completion.choices[0]?.message?.content || 'Could not generate merged email.';
    await prisma.mailMergeAIChatMessage.create({ data: { chatId: chat!.id, sender: 'bot', content: answer } });

    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        await fetch(`${process.env.BACKEND_URL || 'http://localhost:5000'}/api/user/update-limit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ limitType: 'message' })
        });
      }
    } catch (e) {
      console.error('Limit update failed (non-blocking):', e);
    }

    const messages = await prisma.mailMergeAIChatMessage.findMany({ where: { chatId: chat!.id }, orderBy: { createdAt: 'asc' } });
    res.json({ chat_id: chat!.id, messages });
  } catch (err) {
    console.error('uploadAndGenerate error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

// GET /chat/:chat_id
export const getChatById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as number | undefined;
    const { chat_id } = req.params;
    const chat = await prisma.mailMergeAIChat.findUnique({ where: { id: Number(chat_id) }, include: { messages: { orderBy: { createdAt: 'asc' } } } });
    if (!chat || chat.userId !== userId) return res.status(404).json({ error: 'Chat not found' });
    res.json({ chat_id: chat.id, messages: chat.messages });
  } catch (err) {
    console.error('getChatById error:', err);
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
};

// DELETE /chats
export const clearHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as number | undefined;
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });
    const chats = await prisma.mailMergeAIChat.findMany({ where: { userId } });
    const chatIds = chats.map((c: any) => c.id);
    await prisma.mailMergeAIChatMessage.deleteMany({ where: { chatId: { in: chatIds } } });
    await prisma.mailMergeAIChat.deleteMany({ where: { id: { in: chatIds } } });
    res.json({ success: true });
  } catch (err) {
    console.error('clearHistory error:', err);
    res.status(500).json({ error: 'Failed to clear history' });
  }
};

// GET /latest
export const getLatestChat = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as number | undefined;
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });
    const latest = await prisma.mailMergeAIChat.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' } } }
    });
    if (!latest) return res.json({ chat_id: null, messages: [] });
    res.json({ chat_id: latest.id, messages: latest.messages });
  } catch (err) {
    console.error('getLatestChat error:', err);
    res.status(500).json({ error: 'Failed to fetch latest chat' });
  }
};

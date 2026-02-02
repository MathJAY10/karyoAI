import { Request, Response } from 'express';
import OpenAI from 'openai';
import prisma from '../../lib/prisma';
import * as XLSX from 'xlsx';

export const uploadAndGenerate = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as number | undefined;
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });

    const file = (req as any).file as Express.Multer.File | undefined;
    const { prompt, chatId } = req.body as { prompt?: string; chatId?: string };
    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Prompt is required' });

    let chat = null as { id: number } | null;
    if (chatId) {
      chat = await prisma.mailChat.findUnique({ where: { id: Number(chatId) } });
      if (!chat) return res.status(404).json({ error: 'Chat not found' });
    } else {
      chat = await prisma.mailChat.create({ data: { userId } });
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const firstSheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });

    await prisma.mailChatMessage.create({ data: { chatId: chat!.id, sender: 'user', content: prompt } });

    const previewRows = rows.slice(0, 5);
    const columns = Object.keys(previewRows[0] || {});
    const preview = JSON.stringify({ columns, sample: previewRows }, null, 2);

    const system = 'You are a senior email copywriter. Create concise, professional, personalized emails. If sample data is provided, use it only to infer tone and fields; do not leak raw data. Return only the email body.';
    const userContent = `User prompt: ${prompt}\n\nExcel sample (columns + first rows):\n${preview}`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent }
      ],
      temperature: 0.4,
    });

    const answer = completion.choices[0]?.message?.content || 'Could not generate email.';
    await prisma.mailChatMessage.create({ data: { chatId: chat!.id, sender: 'bot', content: answer } });

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

    const messages = await prisma.mailChatMessage.findMany({ where: { chatId: chat!.id }, orderBy: { createdAt: 'asc' } });
    res.json({ chat_id: chat!.id, messages });
  } catch (err) {
    console.error('uploadAndGenerate error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
};

export const getChatById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as number | undefined;
    const { chat_id } = req.params;
    const chat = await prisma.mailChat.findUnique({ where: { id: Number(chat_id) }, include: { messages: { orderBy: { createdAt: 'asc' } } } });
    if (!chat || chat.userId !== userId) return res.status(404).json({ error: 'Chat not found' });
    res.json({ chat_id: chat.id, messages: chat.messages });
  } catch (err) {
    console.error('getChatById error:', err);
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
};

export const clearHistory = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as number | undefined;
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });
    const chats = await prisma.mailChat.findMany({ where: { userId } });
    const chatIds = chats.map(c => c.id);
    await prisma.mailChatMessage.deleteMany({ where: { chatId: { in: chatIds } } });
    await prisma.mailChat.deleteMany({ where: { id: { in: chatIds } } });
    res.json({ success: true });
  } catch (err) {
    console.error('clearHistory error:', err);
    res.status(500).json({ error: 'Failed to clear history' });
  }
};

export const getLatestChat = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as number | undefined;
    if (!userId) return res.status(401).json({ error: 'User not authenticated' });
    const latest = await prisma.mailChat.findFirst({
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



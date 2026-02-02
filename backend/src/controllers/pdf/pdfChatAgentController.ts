import { Request, Response } from 'express';
import OpenAI from 'openai';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import prisma from '../../lib/prisma';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const chatWithPDF = async (req: Request, res: Response) => {
  try {
    // IMPORTANT: The userId must exist in the users table due to foreign key constraint.
    // For production, always use the authenticated user's ID. For local testing, ensure a user with id=1 exists.
    // If not authenticated, return an error instead of defaulting to 1.
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated. Please log in.' });
    }
    
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) {
      return res.status(400).json({ error: 'No PDF files uploaded' });
    }
    
    if (!req.body.question || typeof req.body.question !== 'string') {
      files.forEach(f => fs.unlinkSync(f.path));
      return res.status(400).json({ error: 'No question provided' });
    }
    
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: `PDF file size exceeds 10MB limit: ${file.originalname}` });
      }
    }
    
    // Create new chat session
    const fileNames = files.map(f => f.originalname).join(', ');
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const fileTypes = files.map(f => f.mimetype).join(', ');
    
    const chat = await prisma.pdfChat.create({
      data: {
        userId: userId,
        fileName: fileNames,
        fileSize: totalSize,
        fileType: fileTypes
      }
    });
    
    // Store user message
    await prisma.pdfChatMessage.create({
      data: {
        chatId: chat.id,
        sender: 'user',
        content: req.body.question
      }
    });
    
    // Parse PDFs and concatenate text
    let allText = '';
    for (const file of files) {
      try {
        const dataBuffer = fs.readFileSync(file.path);
        const pdfData = await pdfParse(dataBuffer);
        allText += `\n--- File: ${file.originalname} ---\n` + pdfData.text;
      } catch (parseErr) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: `Failed to parse PDF: ${file.originalname}. The file may be corrupted or in an unsupported format.` });
      }
    }
    
    // Compose prompt for OpenAI
    const prompt = `You are a helpful assistant. Answer the following question based on the provided PDF content.\n\nPDF Content:\n${allText.slice(0, 8000)}\n\nQuestion: ${req.body.question}`;
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant for answering questions about PDF documents.' },
        { role: 'user', content: prompt }
      ]
    });
    
    const answer = response.choices[0].message.content || '';
    
    // Store bot message
    await prisma.pdfChatMessage.create({
      data: {
        chatId: chat.id,
        sender: 'bot',
        content: answer
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
    
    files.forEach(f => fs.unlinkSync(f.path));
    
    // Return chat id and all messages
    const messages = await prisma.pdfChatMessage.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'asc' }
    });
    
    res.json({ chat_id: chat.id, messages });
  } catch (err) {
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    if (req.files && Array.isArray(req.files)) {
      for (const f of req.files) {
        if (f && f.path) { try { fs.unlinkSync(f.path); } catch {} }
      }
    }
    res.status(500).json({ error: 'Failed to process PDF chat request' });
  }
};

export const getPDFChatById = async (req: Request, res: Response) => {
  try {
    const { chat_id } = req.params;
    // Optionally, check user ownership here
    const messages = await prisma.pdfChatMessage.findMany({
      where: { chatId: Number(chat_id) },
      orderBy: { createdAt: 'asc' }
    });
    
    if (!messages || messages.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    res.json({ chat_id, messages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat' });
  }
}; 
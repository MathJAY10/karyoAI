import { Request, Response } from 'express';
import OpenAI from 'openai';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import prisma from '../../lib/prisma';
import ragService from '../../services/ragService';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const USE_RAG = process.env.USE_RAG === 'true';

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
    const docIds: string[] = [];
    
    for (const file of files) {
      try {
        const dataBuffer = fs.readFileSync(file.path);
        const pdfData = await pdfParse(dataBuffer);
        const fileText = pdfData.text;
        allText += `\n--- File: ${file.originalname} ---\n` + fileText;
        
        // If using RAG, also ingest into vector database
        if (USE_RAG) {
          try {
            const docId = `pdf_${chat.id}_${uuidv4()}`;
            await ragService.ingestDocument({
              documentId: docId,
              documentText: fileText,
              metadata: {
                originalFileName: file.originalname,
                fileSize: file.size,
                chatId: chat.id,
                userId: userId,
                uploadedAt: new Date().toISOString()
              },
              collectionName: `user_${userId}_documents`
            });
            docIds.push(docId);
            console.log(`✅ Ingested PDF to RAG: ${file.originalname}`);
          } catch (ragError) {
            console.error(`⚠️  Failed to ingest PDF to RAG: ${file.originalname}`, ragError);
            // Don't fail the request if RAG ingestion fails - fall back to context window
          }
        }
      } catch (parseErr) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ error: `Failed to parse PDF: ${file.originalname}. The file may be corrupted or in an unsupported format.` });
      }
    }
    
    // Store document IDs in database for reference
    if (docIds.length > 0) {
      await prisma.pdfChat.update({
        where: { id: chat.id },
        data: {
          // Store as JSON in metadata or separate field if added to schema
        }
      });
    }

    // Generate answer using RAG or standard context window approach
    let answer = '';
    
    if (USE_RAG && docIds.length > 0) {
      // Use RAG pipeline
      try {
        console.log(`🤖 Using RAG for query: "${req.body.question}"`);
        const ragResult = await ragService.ragQuery({
          query: req.body.question,
          collectionName: `user_${userId}_documents`,
          nContextChunks: 5,
          temperature: 0.7,
          maxTokens: 512
        });
        answer = ragResult.answer;
      } catch (ragError) {
        console.error('⚠️  RAG query failed, falling back to context window:', ragError);
        // Fall back to OpenAI with context window
        const prompt = `You are a helpful assistant. Answer the following question based on the provided PDF content.\n\nPDF Content:\n${allText.slice(0, 8000)}\n\nQuestion: ${req.body.question}`;
        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful assistant for answering questions about PDF documents.' },
            { role: 'user', content: prompt }
          ]
        });
        answer = response.choices[0].message.content || '';
      }
    } else {
      // Standard context window approach
      const prompt = `You are a helpful assistant. Answer the following question based on the provided PDF content.\n\nPDF Content:\n${allText.slice(0, 8000)}\n\nQuestion: ${req.body.question}`;
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant for answering questions about PDF documents.' },
          { role: 'user', content: prompt }
        ]
      });
      answer = response.choices[0].message.content || '';
    }
    
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
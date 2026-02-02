import { Request, Response } from 'express';
import OpenAI from 'openai';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import prisma from '../../lib/prisma';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/pdf/smart-data-extractor/upload
// Deprecated: legacy upload-only endpoint removed in favor of uploadAndExtract

// POST /api/pdf/smart-data-extractor/chat
export const chatWithSmartDataExtractor = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated. Please log in.' });
    }
    const { sessionId, prompt } = req.body;
    if (!sessionId || !prompt) {
      return res.status(400).json({ error: 'Session ID and prompt are required.' });
    }
    // Fetch session and validate ownership
    const session = await prisma.smartDataExtractorSession.findUnique({
      where: { id: Number(sessionId) },
      include: { messages: true }
    });
    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    // Guard: require parsed text to proceed
    if (!session.pdfText || session.pdfText.trim().length < 10) {
      return res.status(400).json({ error: 'No extracted text found for this session. Please upload a PDF first or re-upload if the previous parse failed.' });
    }
    const pdfText = session.pdfText;
    // Align prompting with PDF Chat Agent: embed PDF content directly and steer toward JSON outputs
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature: 0,
      messages: [
        { role: 'system', content: 'You are an expert data extraction agent. You already have the extracted TEXT content of the user\'s PDFs. Never claim you cannot open or read PDFs. Do not ask the user to paste text. Use only the provided PDF text. Avoid apologies and disclaimers. When the user intends extraction, respond with STRICT, VALID JSON only (no prose before or after).' },
        {
          role: 'user',
          content: `PDF TEXT (truncated to ~8k chars):\n${pdfText.slice(0, 8000)}\n\nTask: ${prompt || 'Extract all structured data'}\n\nOutput requirements:\n- If extraction is requested, return a single JSON object only.\n- Use concise keys inferred from the document (e.g., invoiceNumber, date, total).\n- If data is unavailable in the text, set the value to null.`
        }
      ]
    });
    const answer = response.choices[0].message.content || '';
    await prisma.smartDataExtractorMessage.createMany({
      data: [
        { sessionId: session.id, sender: 'user', content: prompt },
        { sessionId: session.id, sender: 'bot', content: answer }
      ]
    });
    // Return all messages for the session
    const messages = await prisma.smartDataExtractorMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' }
    });
    res.json({ session_id: session.id, messages, pdf_text_chars: pdfText.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process chat request' });
  }
};

// 1. Add getLatestSession endpoint
export const getLatestSession = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'User not authenticated.' });
    const session = await prisma.smartDataExtractorSession.findFirst({
      where: {
        userId,
        AND: [
          { NOT: { pdfText: null } },
          { NOT: { pdfText: '' } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: { messages: true }
    });
    if (!session) return res.json({ session_id: null, messages: [] });
    res.json({ session_id: session.id, messages: session.messages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch latest session.' });
  }
};

// Get a specific session by id with its messages
export const getSessionById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'User not authenticated.' });
    const { id } = req.params;
    const session = await prisma.smartDataExtractorSession.findUnique({
      where: { id: Number(id) },
      include: { messages: true }
    });
    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: 'Session not found.' });
    }
    res.json({ session_id: session.id, messages: session.messages });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch session.' });
  }
};

// Upload PDFs, parse, create session and immediately extract without a user prompt
export const uploadAndExtract = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated. Please log in.' });
    }
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length) {
      return res.status(400).json({ error: 'No PDF files uploaded' });
    }
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        try { fs.unlinkSync(file.path); } catch {}
        return res.status(400).json({ error: `PDF file size exceeds 10MB limit: ${file.originalname}` });
      }
    }
    // Parse PDFs and concatenate text
    let allText = '';
    for (const file of files) {
      try {
        const dataBuffer = fs.readFileSync(file.path);
        const pdfData = await pdfParse(dataBuffer);
        allText += `\n--- File: ${file.originalname} ---\n` + pdfData.text;
      } catch (parseErr) {
        try { fs.unlinkSync(file.path); } catch {}
        return res.status(400).json({ error: `Failed to parse PDF: ${file.originalname}.` });
      }
    }
    const fileNames = files.map(f => f.originalname).join(', ');
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const fileTypes = files.map(f => f.mimetype).join(', ');
    const session = await prisma.smartDataExtractorSession.create({
      data: { userId, fileName: fileNames, fileSize: totalSize, fileType: fileTypes, pdfText: allText }
    });
    files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });

    const pdfText = (allText || '').trim();
    if (pdfText.length < 10) {
      await prisma.smartDataExtractorMessage.createMany({
        data: [
          { sessionId: session.id, sender: 'bot', content: 'No extractable text found. Please upload an OCR-enabled PDF.' }
        ]
      });
      const messages = await prisma.smartDataExtractorMessage.findMany({
        where: { sessionId: session.id }, orderBy: { createdAt: 'asc' }
      });
      return res.json({ session_id: session.id, messages, pdf_text_chars: pdfText.length, file_names: files.map(f => f.originalname) });
    }

    const cleanText = allText.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
    console.log('Sending to OpenAI:', cleanText.slice(0, 8000));
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature: 0,
      messages: [
        { role: 'system', content: 'You are an expert data extraction agent. You already have the extracted TEXT content of the user\'s PDFs. Never claim you cannot open or read PDFs. Do not ask the user to paste text. Use only the provided PDF text. Avoid apologies and disclaimers. Respond with STRICT, VALID JSON only (no prose before or after).' },
        { role: 'user', content: `PDF TEXT (truncated to ~8k chars):\n${cleanText.slice(0, 8000)}\n\nTask: Extract all structured data from the document into a single JSON object. If a field is missing, set it to null.` }
      ]
    });
    const answer = response.choices[0].message.content || '';
    let extractedData;
    try {
      extractedData = JSON.parse(answer);
    } catch (e) {
      await prisma.smartDataExtractorMessage.createMany({
        data: [
          { sessionId: session.id, sender: 'bot', content: 'OpenAI did not return valid JSON. Please try again or check your document.' }
        ]
      });
      const messages = await prisma.smartDataExtractorMessage.findMany({ where: { sessionId: session.id }, orderBy: { createdAt: 'asc' } });
      return res.json({ session_id: session.id, messages, pdf_text_chars: cleanText.length, file_names: files.map(f => f.originalname) });
    }
    await prisma.smartDataExtractorMessage.createMany({
      data: [
        { sessionId: session.id, sender: 'bot', content: answer }
      ]
    });
    const messages = await prisma.smartDataExtractorMessage.findMany({ where: { sessionId: session.id }, orderBy: { createdAt: 'asc' } });
    res.json({ session_id: session.id, messages, pdf_text_chars: cleanText.length, file_names: files.map(f => f.originalname) });
  } catch (err) {
    if (req.files && Array.isArray(req.files)) {
      for (const f of req.files) {
        if (f && f.path) { try { fs.unlinkSync(f.path); } catch {} }
      }
    }
    res.status(500).json({ error: 'Failed to upload and extract' });
  }
};

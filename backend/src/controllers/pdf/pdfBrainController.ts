import { Request, Response } from 'express';
import OpenAI from 'openai';
import fs from 'fs';
import pdfParse from 'pdf-parse';
import { randomUUID } from 'crypto';
import ragService from '../../services/ragService';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type PdfBrainJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

type PdfBrainAnalysis = {
  file: {
    name: string;
    size: number;
    type: string;
  };
  file_name: string;
  file_size: number;
  file_type: string;
  summary: string;
  insights: string;
  wordFrequencies: { word: string; count: number }[];
  entities: { type: string; text: string }[];
  topics: string[];
  diagrams: any[];
  charts: { type: string; title: string; data: { label: string; value: number }[] }[];
};

type PdfBrainJob = {
  id: string;
  status: PdfBrainJobStatus;
  createdAt: string;
  updatedAt: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  userId: number | null;
  result?: PdfBrainAnalysis;
  error?: string;
};

const pdfBrainJobs = new Map<string, PdfBrainJob>();

type NamedEntity = {
  type: string;
  text: string;
};

type StructuredAnalysisPayload = {
  summary?: string;
  insights?: string | string[];
  entities?: NamedEntity[];
  topics?: string[];
};

const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);

const extractJsonPayload = (value: string): string => {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch?.[0]) {
    return arrayMatch[0].trim();
  }

  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch?.[0]) {
    return objectMatch[0].trim();
  }

  return trimmed;
};

const parseJsonArray = <T,>(value: string, fallback: T[]): T[] => {
  try {
    const parsed = JSON.parse(extractJsonPayload(value));
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const parseStructuredAnalysis = (value: string): StructuredAnalysisPayload => {
  try {
    const parsed = JSON.parse(extractJsonPayload(value));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as StructuredAnalysisPayload;
    }
    return {};
  } catch {
    return {};
  }
};

const generateTextWithRag = async (collectionName: string, prompt: string): Promise<string> => {
  const response = await ragService.ragQuery({
    query: prompt,
    collectionName,
    nContextChunks: 5,
    temperature: 0.2,
    maxTokens: 512,
  });

  return response.answer || '';
};

const generateTextWithFallback = async (
  collectionName: string,
  prompt: string,
  systemPrompt: string
): Promise<string> => {
  try {
    return await generateTextWithRag(collectionName, prompt);
  } catch (ragError) {
    console.warn('⚠️  RAG analysis failed, falling back to OpenAI:', ragError);

    if (!hasOpenAIKey) {
      throw ragError;
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    });

    return response.choices[0].message.content || '';
  }
};

const getWordFrequencies = (text: string, topN = 20) => {
  const stopwords = new Set([
    'the','and','for','are','but','not','with','that','this','from','have','was','you','your','has','can','will','all','any','our','their','they','his','her','she','him','its','who','what','which','when','where','how','why','had','were','been','out','one','two','three','four','five','six','seven','eight','nine','ten','a','an','of','in','to','on','at','by','as','is','it','be','or','if','we','do','so','no','yes','about','into','up','down','over','under','again','more','most','some','such','only','own','same','than','too','very','s','t','just','now','d','ll','m','o','re','ve','y','ain','aren','couldn','didn','doesn','hadn','hasn','haven','isn','ma','mightn','mustn','needn','shan','shouldn','wasn','weren','won','wouldn'
  ]);

  const words = text.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/);
  const freq: Record<string, number> = {};

  for (const word of words) {
    if (!word || stopwords.has(word)) continue;
    freq[word] = (freq[word] || 0) + 1;
  }

  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, topN).map(([word, count]) => ({ word, count }));
};

const buildAnalysisResult = async (
  fileName: string,
  fileSize: number,
  fileType: string,
  text: string,
  userId: number | null,
  token?: string
): Promise<PdfBrainAnalysis> => {
  const collectionName = `pdf_brain_${userId ?? 'anonymous'}_${randomUUID().replace(/-/g, '')}`;
  const documentId = `pdf_${randomUUID().replace(/-/g, '')}`;

  try {
    await ragService.ingestDocument({
      documentId,
      documentText: text,
      metadata: {
        originalFileName: fileName,
        fileSize,
        fileType,
        userId,
        source: 'pdf_brain_analysis',
      },
      collectionName,
    });
  } catch (ragError) {
    console.warn('⚠️  Failed to ingest PDF into RAG, using fallback generation:', ragError);
  }

  const analysisWindow = text.slice(0, 4000);
  const analysisPrompt = `Analyze the following PDF content and return ONLY valid JSON with this exact shape:\n{\n  "summary": "one concise paragraph",\n  "insights": ["insight 1", "insight 2", "insight 3"],\n  "entities": [{ "type": "Person|Organization|Location|Date|Other", "text": "entity text" }],\n  "topics": ["topic 1", "topic 2", "topic 3", "topic 4", "topic 5"]\n}\n\nPDF content:\n${analysisWindow}`;

  const structuredAnalysis = parseStructuredAnalysis(
    await generateTextWithFallback(
      collectionName,
      analysisPrompt,
      'You are an expert document analysis assistant. Return only JSON.'
    )
  );

  const summary = typeof structuredAnalysis.summary === 'string' && structuredAnalysis.summary.trim()
    ? structuredAnalysis.summary.trim()
    : `Document analysis for ${fileName}.`;

  const insights = Array.isArray(structuredAnalysis.insights)
    ? structuredAnalysis.insights.join('\n')
    : typeof structuredAnalysis.insights === 'string'
      ? structuredAnalysis.insights
      : '';

  const wordFrequencies = getWordFrequencies(text);
  const entities = Array.isArray(structuredAnalysis.entities) ? structuredAnalysis.entities : [];
  const topics = Array.isArray(structuredAnalysis.topics) ? structuredAnalysis.topics : [];

  try {
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
  } catch {
    // Don't fail the analysis if limit update fails
  }

  const diagrams: any[] = [];
  const charts: { type: string; title: string; data: { label: string; value: number }[] }[] = [];

  if (wordFrequencies.length > 0) {
    charts.push({
      type: 'word_frequency',
      title: 'Word Frequency Analysis',
      data: wordFrequencies.slice(0, 10).map(wf => ({
        label: wf.word,
        value: wf.count
      }))
    });
  }

  if (entities.length > 0) {
    const entityCounts = entities.reduce((acc: Record<string, number>, entity) => {
      acc[entity.type] = (acc[entity.type] || 0) + 1;
      return acc;
    }, {});

    charts.push({
      type: 'entity_distribution',
      title: 'Entity Distribution',
      data: Object.entries(entityCounts).map(([type, count]) => ({
        label: type,
        value: count
      }))
    });
  }

  if (topics.length > 0) {
    charts.push({
      type: 'topics',
      title: 'Key Topics',
      data: topics.map((topic, index) => ({
        label: topic,
        value: topics.length - index
      }))
    });
  }

  if (charts.length === 0 && wordFrequencies.length > 0) {
    charts.push({
      type: 'word_frequency',
      title: 'Document Analysis',
      data: wordFrequencies.slice(0, 8).map(wf => ({
        label: wf.word,
        value: wf.count
      }))
    });
  }

  return {
    file: {
      name: fileName,
      size: fileSize,
      type: fileType,
    },
    file_name: fileName,
    file_size: fileSize,
    file_type: fileType,
    summary,
    insights,
    wordFrequencies,
    entities,
    topics,
    diagrams,
    charts
  };
};

const processPdfBrainJob = async (jobId: string) => {
  const job = pdfBrainJobs.get(jobId);
  if (!job) {
    return;
  }

  job.status = 'processing';
  job.updatedAt = new Date().toISOString();

  try {
    const dataBuffer = fs.readFileSync(job.filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    if (!text.trim()) {
      throw new Error('Unable to extract text from the PDF');
    }

    const result = await buildAnalysisResult(
      job.fileName,
      job.fileSize,
      job.fileType,
      text,
      job.userId,
      undefined
    );

    job.result = result;
    job.status = 'completed';
    job.updatedAt = new Date().toISOString();
  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Failed to analyze PDF';
    job.updatedAt = new Date().toISOString();
  } finally {
    try {
      fs.unlinkSync(job.filePath);
    } catch {
      // Ignore cleanup errors
    }
  }
};

export const analyzePDF = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || null;
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }
    const { originalname, size, mimetype, path: filePath } = req.file;
    const jobId = randomUUID();
    const job: PdfBrainJob = {
      id: jobId,
      status: 'queued',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      filePath,
      fileName: originalname,
      fileSize: size,
      fileType: mimetype,
      userId,
    };

    pdfBrainJobs.set(jobId, job);

    const token = req.headers.authorization?.split(' ')[1];
    setImmediate(() => {
      void (async () => {
        const currentJob = pdfBrainJobs.get(jobId);
        if (!currentJob) {
          return;
        }

        try {
          currentJob.status = 'processing';
          currentJob.updatedAt = new Date().toISOString();
          const dataBuffer = fs.readFileSync(currentJob.filePath);
          const pdfData = await pdfParse(dataBuffer);
          const text = pdfData.text;

          if (!text.trim()) {
            throw new Error('Unable to extract text from the PDF');
          }

          const result = await buildAnalysisResult(
            currentJob.fileName,
            currentJob.fileSize,
            currentJob.fileType,
            text,
            currentJob.userId,
            token
          );

          currentJob.result = result;
          currentJob.status = 'completed';
          currentJob.updatedAt = new Date().toISOString();
        } catch (error) {
          currentJob.status = 'failed';
          currentJob.error = error instanceof Error ? error.message : 'Failed to analyze PDF';
          currentJob.updatedAt = new Date().toISOString();
        } finally {
          try {
            fs.unlinkSync(currentJob.filePath);
          } catch {
            // Ignore cleanup errors
          }
        }
      })();
    });

    return res.status(202).json({
      job_id: jobId,
      status: 'queued',
      status_url: `/api/pdf/brain/jobs/${jobId}`
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to analyze PDF' });
  }
}; 

export const getAnalyzePDFJob = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const job = pdfBrainJobs.get(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    return res.json({
      job_id: job.id,
      status: job.status,
      result: job.result || null,
      error: job.error || null,
      created_at: job.createdAt,
      updated_at: job.updatedAt
    });
  } catch {
    res.status(500).json({ error: 'Failed to get PDF analysis job' });
  }
};
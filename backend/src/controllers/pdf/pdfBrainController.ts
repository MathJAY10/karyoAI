import { Request, Response } from 'express';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const analyzePDF = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || null;
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }
    const { originalname, size, mimetype, path: filePath } = req.file;
    // Read PDF file
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;
    // Generate summary using OpenAI
    const summaryPrompt = `Summarize the following PDF content in a concise, professional way:\n\n${text.slice(0, 4000)}`;
    const summaryResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant for document analysis.' },
        { role: 'user', content: summaryPrompt }
      ]
    });
    const summary = summaryResponse.choices[0].message.content || '';
    // Generate insights (could be more advanced, for now just a second prompt)
    const insightsPrompt = `Provide 3 key insights or trends from the following PDF content:\n\n${text.slice(0, 4000)}`;
    const insightsResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant for document analysis.' },
        { role: 'user', content: insightsPrompt }
      ]
    });
    const insights = insightsResponse.choices[0].message.content || '';
    // Word frequency analysis
    function getWordFrequencies(text: string, topN = 20) {
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
    }
    const wordFrequencies = getWordFrequencies(text);
    // Named Entity Recognition (NER) and Key Topics extraction
    let entities = [];
    let topics = [];
    try {
      // NER
      const nerPrompt = `Extract and list all named entities (Person, Organization, Location, Date, etc.) from the following PDF content. Return as a JSON array of objects with 'type' and 'text' fields.\n\n${text.slice(0, 4000)}`;
      const nerResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an expert at extracting structured information from documents.' },
          { role: 'user', content: nerPrompt }
        ]
      });
      const nerText = nerResponse.choices[0].message.content || '[]';
      try {
        entities = JSON.parse(nerText);
        if (!Array.isArray(entities)) entities = [];
      } catch { entities = []; }
      // Key Topics
      const topicsPrompt = `List the 5 most important topics or keywords from the following PDF content. Return as a JSON array of strings.\n\n${text.slice(0, 4000)}`;
      const topicsResponse = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are an expert at extracting key topics from documents.' },
          { role: 'user', content: topicsPrompt }
        ]
      });
      const topicsText = topicsResponse.choices[0].message.content || '[]';
      try {
        topics = JSON.parse(topicsText);
        if (!Array.isArray(topics)) topics = [];
      } catch { topics = []; }
    } catch (e) {
      entities = [];
      topics = [];
    }

    // Update user limit after successful OpenAI responses (4 calls total)
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        // Update limit 4 times for the 4 OpenAI calls made
        for (let i = 0; i < 4; i++) {
          await fetch(`${process.env.BACKEND_URL || 'http://localhost:5000'}/api/user/update-limit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ limitType: 'message' })
          });
        }
      }
    } catch (limitError) {
      console.error('Failed to update user limit:', limitError);
      // Don't fail the request if limit update fails
    }
    // Placeholder for diagrams/charts extraction (future: use NLP/ML to extract data)
    const diagrams: any[] = [];
    const charts: any[] = [];
    
    // Generate chart data from word frequencies
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
    
    // Generate chart data from entities if available
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
    
    // Generate chart data from topics if available
    if (topics.length > 0) {
      charts.push({
        type: 'topics',
        title: 'Key Topics',
        data: topics.map((topic, index) => ({
          label: topic,
          value: topics.length - index // Give higher weight to first topics
        }))
      });
    }
    
    // If no other data, create a simple chart from word frequencies
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
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    res.json({
      analysis: {
        file_name: originalname,
        file_size: size,
        file_type: mimetype,
        summary,
        insights,
        wordFrequencies,
        entities,
        topics,
        diagrams,
        charts
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to analyze PDF' });
  }
}; 
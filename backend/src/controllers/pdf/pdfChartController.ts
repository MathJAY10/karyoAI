import { Request, Response } from 'express';
// @ts-ignore: No types for pdf2pic
import { fromPath } from 'pdf2pic';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const pdfPagesToImages = async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });

    const pdfPath = req.file.path;
    const outputDir = path.join(__dirname, '../../../uploads/pdf-images');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const converter = fromPath(pdfPath, {
      density: 150,
      saveFilename: 'page',
      savePath: outputDir,
      format: 'png',
      width: 800,
      height: 1000,
    });

    // Get number of pages using pdf-parse
    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(dataBuffer);
    const numPages = pdfData.numpages || 1;

    const imagePromises = [];
    for (let i = 1; i <= numPages; i++) {
      imagePromises.push(converter(i));
    }
    const images = await Promise.all(imagePromises);

    // Clean up uploaded file
    fs.unlinkSync(pdfPath);

    // Return base64 images
    res.json({ images: images.map((img: any) => img.base64) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to convert PDF to images' });
  }
};

export const suggestChart = async (req: Request, res: Response) => {
  try {
    const jsonData = req.body.data;
    if (!jsonData) return res.status(400).json({ error: 'No data provided' });

    const prompt = `Suggest the best chart type (bar, line, pie, etc.) for this data. Only respond with the chart type (e.g., "bar", "line", "pie"):\n${JSON.stringify(jsonData)}`;
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 10,
    });

    const suggestion = completion.choices[0].message.content
      ? completion.choices[0].message.content.trim().toLowerCase()
      : 'bar'; // fallback to 'bar' if no suggestion

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

    res.json({ chartType: suggestion });
  } catch (err) {
    res.status(500).json({ error: 'Failed to suggest chart type' });
  }
}; 
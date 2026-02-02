import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import OpenAI from 'openai';
import prisma from '../../lib/prisma';
import { JwtPayload } from 'jsonwebtoken';

interface AnalysisResult {
  id: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  insight: string;
  errors: string[];
  trends: string[];
  createdAt: Date;
}

// Helper function for outlier detection
const detectOutliers = (data: any[], column: string): string[] => {
  const values = data
    .map(row => parseFloat(row[column]))
    .filter(v => !isNaN(v) && v !== null);
  
  if (values.length < 3) return [];

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const threshold = 2; // 2 standard deviations

  const outliers: string[] = [];
  data.forEach((row, index) => {
    const value = parseFloat(row[column]);
    if (!isNaN(value) && Math.abs(value - mean) > threshold * stdDev) {
      outliers.push(`Row ${index + 2}: Value '${value}' in column '${column}' is a potential outlier`);
    }
  });

  return outliers;
};

// Helper function to safely convert JSON to string array
const safeJsonToStringArray = (json: any): string[] => {
  if (!json || !Array.isArray(json)) return [];
  return json.filter((item): item is string => typeof item === 'string');
};

// POST /api/error-trend/analyze
export const analyzeExcelForErrorsAndTrends = async (req: Request, res: Response) => {
  try {
    // Check OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    // Check authentication
    const user = req.user as JwtPayload;
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check file upload
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream'
    ];
    
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.mimetype) && !allowedExtensions.includes(fileExtension)) {
      return res.status(400).json({ error: 'Only Excel files (.xlsx, .xls) are allowed' });
    }

    // Parse Excel file
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null }) as any[];

    if (!jsonData || jsonData.length === 0) {
      return res.status(400).json({ error: 'No data found in the Excel file' });
    }

    // Basic data quality checks
    const errors: string[] = [];
    const columns = Object.keys(jsonData[0] || {});

    // Check for missing values
    jsonData.forEach((row, rowIndex) => {
      columns.forEach(col => {
        if (row[col] === null || row[col] === undefined || row[col] === '') {
          errors.push(`Missing value in row ${rowIndex + 2}, column '${col}'`);
        }
      });
    });

    // Check for duplicate rows
    const seen = new Set();
    const duplicates: number[] = [];
    jsonData.forEach((row, rowIndex) => {
      const rowString = JSON.stringify(row);
      if (seen.has(rowString)) {
        duplicates.push(rowIndex + 2);
      } else {
        seen.add(rowString);
      }
    });
    
    if (duplicates.length > 0) {
      errors.push(`Found ${duplicates.length} duplicate rows (rows: ${duplicates.slice(0, 5).join(', ')}${duplicates.length > 5 ? '...' : ''})`);
    }

    // Check for outliers in numeric columns
    const numericColumns = columns.filter(col => 
      jsonData.slice(0, Math.min(100, jsonData.length)).every(row => 
        row[col] === null || typeof row[col] === 'number' || !isNaN(parseFloat(row[col]))
      )
    );

    numericColumns.forEach(col => {
      const outliers = detectOutliers(jsonData, col);
      errors.push(...outliers);
    });

    // Prepare data summary for AI analysis
    const dataSummary = {
      rowCount: jsonData.length,
      columnCount: columns.length,
      columns: columns,
      sampleData: jsonData.slice(0, 5),
      errors: errors.slice(0, 10),
      numericColumns: numericColumns
    };

    // AI Analysis
    const openai = new OpenAI({ apiKey: openaiApiKey });
    
    const systemPrompt = `You are an expert data analyst. Analyze the provided Excel data and identify:
1. Key insights about the data
2. Important trends and patterns
3. Data quality issues and errors

Be concise and provide actionable insights.`;

    const userPrompt = `Analyze this Excel data:

Data Summary:
- ${dataSummary.rowCount} rows, ${dataSummary.columnCount} columns
- Columns: ${dataSummary.columns.join(', ')}
- Numeric columns: ${dataSummary.numericColumns.join(', ')}

Sample Data (first 5 rows):
${JSON.stringify(dataSummary.sampleData, null, 2)}

Detected Issues:
${dataSummary.errors.length > 0 ? dataSummary.errors.join('\n') : 'No major issues detected'}

Please provide:
1. A main insight about the data
2. Up to 5 key trends
3. Up to 5 critical errors or issues

Format your response as JSON with keys: "insight", "trends", "errors"`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 800,
      temperature: 0.3
    });

    let aiInsight = 'Could not generate AI insight';
    let aiTrends: string[] = [];
    let aiErrors: string[] = [];

    try {
      const aiResponse = completion.choices[0].message?.content;
      if (aiResponse) {
        const parsed = JSON.parse(aiResponse);
        aiInsight = parsed.insight || aiInsight;
        aiTrends = Array.isArray(parsed.trends) ? parsed.trends : [];
        aiErrors = Array.isArray(parsed.errors) ? parsed.errors : [];
      }
    } catch (e) {
      console.error('Failed to parse AI response:', e);
    }

    // Combine all errors
    const allErrors = [...new Set([...errors.slice(0, 10), ...aiErrors])];

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

    // Save to database
    const analysis = await prisma.excelAnalysis.create({
  data: {
    userId: user.id,
    fileName: (file.originalname || '').slice(0, 255), // if fileName is also limited
    fileSize: file.size,
    fileType: (file.mimetype || '').slice(0, 64),      // <-- fix here
    errors: allErrors,
    trends: aiTrends,
    insight: aiInsight,
    chatHistory: undefined
  }
});

    // Return formatted response
    const result: AnalysisResult = {
      id: analysis.id,
      fileName: analysis.fileName || file.originalname,
      fileSize: analysis.fileSize || file.size,
      fileType: analysis.fileType || file.mimetype,
      insight: analysis.insight || aiInsight,
      errors: safeJsonToStringArray(analysis.errors),
      trends: safeJsonToStringArray(analysis.trends),
      createdAt: analysis.createdAt
    };

    res.json(result);

  } catch (error: any) {
    console.error('Error analyzing Excel file:', error);
    res.status(500).json({ 
      error: 'Failed to analyze Excel file',
      details: error.message 
    });
  }
};

// GET /api/error-trend/analysis/:id
export const getAnalysisById = async (req: Request, res: Response) => {
  try {
    const user = req.user as JwtPayload;
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const analysisId = parseInt(req.params.id);
    if (isNaN(analysisId)) {
      return res.status(400).json({ error: 'Invalid analysis ID' });
    }

    const analysis = await prisma.excelAnalysis.findUnique({
      where: { id: analysisId }
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    if (analysis.userId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result: AnalysisResult = {
      id: analysis.id,
      fileName: analysis.fileName || '',
      fileSize: analysis.fileSize || 0,
      fileType: analysis.fileType || '',
      insight: analysis.insight || '',
      errors: safeJsonToStringArray(analysis.errors),
      trends: safeJsonToStringArray(analysis.trends),
      createdAt: analysis.createdAt
    };

    res.json(result);

  } catch (error: any) {
    console.error('Error fetching analysis:', error);
    res.status(500).json({ 
      error: 'Failed to fetch analysis',
      details: error.message 
    });
  }
};

// GET /api/error-trend/latest
export const getLatestAnalysis = async (req: Request, res: Response) => {
  try {
    const user = req.user as JwtPayload;
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const analysis = await prisma.excelAnalysis.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    if (!analysis) {
      return res.status(404).json({ error: 'No analysis found' });
    }

    const result: AnalysisResult = {
      id: analysis.id,
      fileName: analysis.fileName || '',
      fileSize: analysis.fileSize || 0,
      fileType: analysis.fileType || '',
      insight: analysis.insight || '',
      errors: safeJsonToStringArray(analysis.errors),
      trends: safeJsonToStringArray(analysis.trends),
      createdAt: analysis.createdAt
    };

    res.json(result);

  } catch (error: any) {
    console.error('Error fetching latest analysis:', error);
    res.status(500).json({ 
      error: 'Failed to fetch latest analysis',
      details: error.message 
    });
  }
};

// DELETE /api/error-trend/analysis/:id
export const deleteAnalysis = async (req: Request, res: Response) => {
  try {
    const user = req.user as JwtPayload;
    if (!user || !user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const analysisId = parseInt(req.params.id);
    if (isNaN(analysisId)) {
      return res.status(400).json({ error: 'Invalid analysis ID' });
    }

    const analysis = await prisma.excelAnalysis.findUnique({
      where: { id: analysisId }
    });

    if (!analysis) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    if (analysis.userId !== user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.excelAnalysis.delete({
      where: { id: analysisId }
    });

    res.status(204).send();

  } catch (error: any) {
    console.error('Error deleting analysis:', error);
    res.status(500).json({ 
      error: 'Failed to delete analysis',
      details: error.message 
    });
  }
}; 
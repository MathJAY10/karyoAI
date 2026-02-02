import { Request, Response } from 'express';
import prisma from '../../lib/prisma';

const HARDCODED_PUBLIC_PROMPTS = [
  {
    id: 'public-1',
    title: 'Sales Data Analysis',
    prompt: 'Analyze sales data to identify top-performing products, seasonal trends, customer segments, and provide actionable insights for improving sales performance.'
  },
  {
    id: 'public-2',
    title: 'Inventory Optimization',
    prompt: 'Analyze inventory levels, turnover rates, and demand patterns to optimize stock levels, reduce carrying costs, and prevent stockouts.'
  },
  {
    id: 'public-3',
    title: 'Customer Satisfaction Report',
    prompt: 'Analyze customer feedback and satisfaction scores to identify areas of improvement, track satisfaction trends, and provide recommendations for enhancing customer experience.'
  },
  {
    id: 'public-4',
    title: 'HR Performance Report',
    prompt: 'Generate an HR performance report including employee productivity metrics, attendance patterns, training completion rates, and recommendations for team development.'
  },
  {
    id: 'public-5',
    title: 'Marketing Campaign Analysis',
    prompt: 'Analyze marketing campaign performance data including ROI, conversion rates, customer acquisition costs, and provide optimization strategies for future campaigns.'
  },
  {
    id: 'public-6',
    title: 'Financial Budget Tracker',
    prompt: 'Create a budget tracking system that monitors expenses vs. budget, identifies variances, calculates spending trends, and provides cost-saving recommendations.'
  },
  {
    id: 'public-7',
    title: 'Customer Data Analysis',
    prompt: 'Analyze customer data to identify purchasing patterns, segment customers by behavior, calculate lifetime value, and recommend personalization strategies.'
  },
  {
    id: 'public-8',
    title: 'Inventory Management Report',
    prompt: 'Generate an inventory management report showing stock levels, turnover rates, reorder points, and identify slow-moving or overstocked items.'
  },
  {
    id: 'public-9',
    title: 'Lead Conversion Analysis',
    prompt: 'Analyze lead conversion data to identify the most effective channels, conversion bottlenecks, and provide strategies to improve conversion rates.'
  },
  {
    id: 'public-10',
    title: 'Data Validation & Quality Check',
    prompt: 'Perform a comprehensive data quality check including completeness, accuracy, consistency, and validity. Provide a detailed report with recommendations for data improvement.'
  }
];

export const addPrompt = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { title, prompt } = req.body;
    
    if (!title || !prompt) return res.status(400).json({ error: 'Title and prompt required' });
    
    const newPrompt = await prisma.aIWorkmatePrompt.create({
      data: { userId: userId, title, prompt }
    });
    
    res.json(newPrompt);
  } catch (err) {
    res.status(500).json({ error: 'Could not add prompt' });
  }
};

export const listMyPrompts = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    const prompts = await prisma.aIWorkmatePrompt.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(prompts);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch prompts' });
  }
};

export const listPublicPrompts = async (_req: Request, res: Response) => {
  try {
    const prompts = await prisma.aIWorkmatePrompt.findMany({
      where: { userId: null },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json([...HARDCODED_PUBLIC_PROMPTS, ...prompts]);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch public prompts' });
  }
};

export const deletePrompt = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const promptId = Number(req.params.id);
    
    await prisma.aIWorkmatePrompt.deleteMany({
      where: { 
        id: promptId, 
        userId: userId 
      }
    });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete prompt' });
  }
};
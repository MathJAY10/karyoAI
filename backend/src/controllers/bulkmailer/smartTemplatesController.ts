import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import OpenAI from 'openai';

export const listTemplates = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as number | undefined;
    const includePublic = req.query.public === 'true';
    const where: any = {};
    if (userId) {
      where.OR = [{ userId }, { isPublic: true }];
    } else if (includePublic) {
      where.isPublic = true;
    } else {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const templates = await (prisma as any).mailTemplate.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json({ templates });
  } catch (err) {
    console.error('listTemplates error:', err);
    res.status(500).json({ error: 'Failed to list templates' });
  }
};

export const getTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tpl = await (prisma as any).mailTemplate.findUnique({ where: { id: Number(id) } });
    if (!tpl) return res.status(404).json({ error: 'Template not found' });
    // if private, ensure ownership
    const userId = (req as any).user?.id as number | undefined;
    if (!tpl.isPublic && tpl.userId && tpl.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
    res.json({ template: tpl });
  } catch (err) {
    console.error('getTemplate error:', err);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
};

export const createTemplate = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as number | undefined;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    const { title, subject, description, body, category, isPublic } = req.body as any;
    if (!title || !body) return res.status(400).json({ error: 'title and body are required' });
    try {
      const tpl = await (prisma as any).mailTemplate.create({ data: { userId, title, subject, description, body, category, isPublic: !!isPublic } });
      res.json({ template: tpl });
    } catch (err: any) {
      if (err.code === 'P2002' && err.meta?.target?.includes('title')) {
        return res.status(409).json({ error: 'A template with this title already exists. Please use a different title.' });
      }
      throw err;
    }
  } catch (err) {
    console.error('createTemplate error:', err);
    res.status(500).json({ error: 'Failed to create template' });
  }
};

export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as number | undefined;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    const { id } = req.params;
    const existing = await (prisma as any).mailTemplate.findUnique({ where: { id: Number(id) } });
    if (!existing) return res.status(404).json({ error: 'Template not found' });
    if (existing.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
    const { title, subject, description, body, category, isPublic } = req.body as any;
    const tpl = await (prisma as any).mailTemplate.update({ where: { id: Number(id) }, data: { title, subject, description, body, category, isPublic } });
    res.json({ template: tpl });
  } catch (err) {
    console.error('updateTemplate error:', err);
    res.status(500).json({ error: 'Failed to update template' });
  }
};

export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as number | undefined;
    // Placeholder: isAdmin check (replace with real admin check if available)
    const isAdmin = (req as any).user?.role === 'admin';
    if (!userId && !isAdmin) return res.status(401).json({ error: 'Authentication required' });
    const { id } = req.params;
    const existing = await (prisma as any).mailTemplate.findUnique({ where: { id: Number(id) } });
    if (!existing) return res.status(404).json({ error: 'Template not found' });
    // Allow delete if user is owner or admin
    if (!isAdmin && existing.userId !== userId) return res.status(403).json({ error: 'Forbidden' });
    await (prisma as any).mailTemplate.delete({ where: { id: Number(id) } });
    res.json({ success: true });
  } catch (err) {
    console.error('deleteTemplate error:', err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
};

export const getUserTemplateTitles = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as number | undefined;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    const titles = await (prisma as any).mailTemplate.findMany({
      where: { userId },
      select: { title: true },
      orderBy: { title: 'asc' },
    });
    res.json({ titles: titles.map((t: { title: string }) => t.title) });
  } catch (err) {
    console.error('getUserTemplateTitles error:', err);
    res.status(500).json({ error: 'Failed to fetch template titles' });
  }
};

// POST /ai-edit/:id or /ai-edit to create+edit
export const aiEditTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { instruction, title, subject, description, category } = req.body as any;
    if (!instruction || typeof instruction !== 'string') return res.status(400).json({ error: 'instruction is required' });

    let tpl = null as any;
    if (id) {
      tpl = await (prisma as any).mailTemplate.findUnique({ where: { id: Number(id) } });
      if (!tpl) return res.status(404).json({ error: 'Template not found' });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const system = 'You are a senior email copywriter. Edit the provided email template body according to the user instructions. Return only the edited email body. Keep subject and tone professional.';
    const userContent = `Instruction: ${instruction}\n\nTemplate body:\n${tpl?.body || ''}`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent }
      ],
      temperature: 0.3,
      max_tokens: 1024,
    });
    const edited = completion.choices[0]?.message?.content || '';

    if (tpl) {
      const updated = await (prisma as any).mailTemplate.update({ where: { id: tpl.id }, data: { body: edited } });
      return res.json({ template: updated });
    }

    // create new with edited body
    const userId = (req as any).user?.id as number | undefined;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    const newTpl = await (prisma as any).mailTemplate.create({ data: { userId, title: title || 'AI Template', subject, description, category, body: edited } });
    res.json({ template: newTpl });
  } catch (err) {
    console.error('aiEditTemplate error:', err);
    res.status(500).json({ error: 'Failed to edit template via AI' });
  }
};

export default {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  aiEditTemplate,
};

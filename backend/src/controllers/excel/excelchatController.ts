import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../lib/prisma';
import { JwtPayload } from 'jsonwebtoken';

const chatParams = z.object({
  chatId: z.string().regex(/^\d+$/),
});

export const getChatHistory = async (req: Request, res: Response) => {
    try {
        const user = req.user as JwtPayload;
        const { chatId } = chatParams.parse(req.params);
        const { toolType } = req.query;
        if (!toolType || typeof toolType !== 'string') {
            return res.status(400).json({ error: 'toolType is required' });
        }
        const chat = await prisma.chat.findUnique({
          where: { id: Number(chatId) }
        });
        if (!chat || chat.userId !== user.id || chat.toolType !== toolType) {
            return res.status(404).json({ error: 'Chat not found or access denied.' });
        }
        const messages = await prisma.chatMessage.findMany({
          where: { chatId: Number(chatId) },
          orderBy: { createdAt: 'asc' }
        });
        res.json({ chat, messages });
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve chat history.' });
    }
};

const getLatestChatParams = z.object({
    toolType: z.enum(['formula_master', 'sheet_summarizer']),
});

export const getLatestChat = async (req: Request, res: Response) => {
    try {
        const user = req.user as JwtPayload;
        const { toolType } = getLatestChatParams.parse(req.query);

        const chat = await prisma.chat.findFirst({
          where: { 
            userId: user.id, 
            toolType 
          },
          orderBy: { updatedAt: 'desc' }
        });
        
        if (!chat) {
            return res.status(404).json({ message: 'No recent chat found.' });
        }

        const messages = await prisma.chatMessage.findMany({
          where: { chatId: chat.id },
          orderBy: { createdAt: 'asc' }
        });
        
        res.json({ chat, messages });

    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve latest chat.' });
    }
};

export const deleteChat = async (req: Request, res: Response) => {
    try {
        const user = req.user as JwtPayload;
        const { chatId } = chatParams.parse(req.params);

        const chat = await prisma.chat.findUnique({
          where: { id: Number(chatId) }
        });
        
        if (!chat || chat.userId !== user.id) {
            return res.status(404).json({ error: 'Chat not found or access denied.' });
        }

        await prisma.chat.delete({
          where: { id: Number(chatId) }
        }); // Assumes ON DELETE CASCADE
        
        res.status(204).send();

    } catch (err) {
        res.status(500).json({ error: 'Failed to delete chat.' });
    }
}; 
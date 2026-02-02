import { Request, Response } from 'express';
import prisma from '../../lib/prisma';
import { JwtPayload } from 'jsonwebtoken';

export const createOfferLetter = async (req: Request, res: Response) => {
  try {
    const userJwt = req.user as JwtPayload;
    if (!userJwt || typeof userJwt !== 'object' || !userJwt.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const { title, data, logo } = req.body as { title?: string; data: any; logo?: string };
    if (!data) return res.status(400).json({ error: 'data is required' });

    const record = await prisma.offerLetter.create({
      data: {
        userId: Number(userJwt.id),
        title: title || (data?.employeeName ? `Offer - ${data.employeeName}` : 'Offer Letter'),
        data,
        logo,
      },
    });
    return res.status(201).json(record);
  } catch (err) {
    console.error('createOfferLetter error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const listOfferLetters = async (req: Request, res: Response) => {
  try {
    const userJwt = req.user as JwtPayload;
    if (!userJwt || typeof userJwt !== 'object' || !userJwt.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const items = await prisma.offerLetter.findMany({
      where: { userId: Number(userJwt.id) },
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, createdAt: true },
    });
    return res.json(items);
  } catch (err) {
    console.error('listOfferLetters error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

export const getOfferLetter = async (req: Request, res: Response) => {
  try {
    const userJwt = req.user as JwtPayload;
    if (!userJwt || typeof userJwt !== 'object' || !userJwt.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    const item = await prisma.offerLetter.findFirst({
      where: { id, userId: Number(userJwt.id) },
    });
    if (!item) return res.status(404).json({ error: 'Not found' });
    return res.json(item);
  } catch (err) {
    console.error('getOfferLetter error', err);
    return res.status(500).json({ error: 'Server error' });
  }
};




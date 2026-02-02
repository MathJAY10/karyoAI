import jwt, { JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';

// Remove AuthenticatedRequest interface to avoid type conflicts

declare module 'express-serve-static-core' {
  interface Request {
    user?: string | JwtPayload;
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'No token provided'
        });
    }
    const token = authHeader.split(' ')[1];
    const accessSecret = process.env.JWT_ACCESS_SECRET as string;
    jwt.verify(token, accessSecret, (err, decoded) => {
        if (err) return res.status(401).json({
            error: 'Invalid token'
        });
        req.user = decoded;
        //nsole.log(token);
        next();
    });
};

export const requireRole = (role: string) => (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || typeof req.user !== 'object' || (req.user as JwtPayload).role !== role) {
        return res.status(403).json({
            error: 'Forbidden: insufficient role'
        });
    }
    next();
};

export const checkMessageLimit = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userJwt = req.user as JwtPayload;
        if (!userJwt || typeof userJwt !== 'object' || !userJwt.id) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userJwt.id },
            select: { messageLimit: true, plan: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.messageLimit <= 0) {
            return res.status(429).json({ 
                error: 'Message limit exceeded',
                message: 'You have reached your message limit. Please upgrade to continue using the service.'
            });
        }

        next();
    } catch (error) {
        console.error('Message limit check error:', error);
        res.status(500).json({ error: 'Failed to check message limit' });
    }
};

export const checkEmailLimit = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userJwt = req.user as JwtPayload;
        if (!userJwt || typeof userJwt !== 'object' || !userJwt.id) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userJwt.id },
            select: { emailLimit: true, plan: true }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.emailLimit <= 0) {
            return res.status(429).json({ 
                error: 'Email limit exceeded',
                message: 'You have reached your email limit. Please upgrade to continue using the service.'
            });
        }

        next();
    } catch (error) {
        console.error('Email limit check error:', error);
        res.status(500).json({ error: 'Failed to check email limit' });
    }
};
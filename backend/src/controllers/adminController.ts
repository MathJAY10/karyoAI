import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import prisma from '../lib/prisma';
require('dotenv').config();


const adminLoginSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(8)
});

export const adminLogin = async (req: Request, res: Response) => {
  try {
    const parsed = adminLoginSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({
      error: parsed.error.errors
    });
    const { username, password } = parsed.data;
    
    const admin = await prisma.admin.findUnique({
      where: { username }
    });
    
    if (!admin) return res.status(401).json({
      error: 'Invalid credentials'
    });
    
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(401).json({
      error: 'Invalid credentials'
    });
    
    const accessSecret = process.env.JWT_ACCESS_SECRET as string;
    const refreshSecret = process.env.JWT_REFRESH_SECRET as string;
    const accessToken = jwt.sign({
        id: admin.id,
        role: 'admin',
        username: admin.username
      },
      accessSecret, {
        expiresIn: '7d'
      }
    );
    const refreshToken = jwt.sign({
        id: admin.id,
        role: 'admin',
        username: admin.username
      },
      refreshSecret, {
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any
      }
    );
    
    res.json({
      admin: {
        id: admin.id,
        username: admin.username,
        role: 'admin'
      },
      accessToken,
      refreshToken
    });
  } catch (err) {
    res.status(500).json({
      error: 'Server error'
    });
  }
};

export const listUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        plan: true,
        active: true,
        messageLimit: true,
        emailLimit: true,
        subscriptionStart: true,
        expiry: true,
        createdAt: true
      }
    });
    
    res.json(users);
  } catch (err) {
    res.status(500).json({
      error: 'Server error'
    });
  }
};

export const toggleActive = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { active: !user.active },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        plan: true,
        active: true,
        messageLimit: true,
        emailLimit: true,
        subscriptionStart: true,
        expiry: true,
        createdAt: true
      }
    });
    
    res.json(updated);
  } catch (err) {
    res.status(500).json({
      error: 'Server error'
    });
  }
};

export const resetLimits = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Set both limits to 50 (not 0)
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        messageLimit: 50,
        emailLimit: 50
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        plan: true,
        active: true,
        messageLimit: true,
        emailLimit: true,
        subscriptionStart: true,
        expiry: true,
        createdAt: true
      }
    });
    
    res.json(updated);
  } catch (err) {
    res.status(500).json({
      error: 'Server error'
    });
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    if (!['ADMIN', 'USER'].includes(role)) return res.status(400).json({
      error: 'Invalid role'
    });
    
    const userId = Number(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        plan: true,
        active: true,
        messageLimit: true,
        emailLimit: true,
        subscriptionStart: true,
        expiry: true,
        createdAt: true
      }
    });
    
    res.json(updated);
  } catch (err) {
    res.status(500).json({
      error: 'Server error'
    });
  }
};

export const updateUserPlan = async (req: Request, res: Response) => {
  try {
    const { plan, messageLimit, emailLimit } = req.body;
    if (!plan || typeof messageLimit !== 'number' || typeof emailLimit !== 'number') {
      return res.status(400).json({ error: 'plan, messageLimit, and emailLimit are required' });
    }
    
    const userId = Number(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { plan, messageLimit, emailLimit },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        plan: true,
        active: true,
        messageLimit: true,
        emailLimit: true,
        subscriptionStart: true,
        expiry: true,
        createdAt: true
      }
    });
    
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const toggleUserPlan = async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Only toggle the plan, do not change limits
    const newPlan = user.plan === 'Free' ? 'Paid' : 'Free';
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { plan: newPlan },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        plan: true,
        active: true,
        messageLimit: true,
        emailLimit: true,
        subscriptionStart: true,
        expiry: true,
        createdAt: true
      }
    });
    
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const updateAdminPassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    
    // Get admin id from JWT (assume req.user is set by auth middleware)
    const user = req.user as any;
    const adminId = user?.id;
    if (!adminId) return res.status(401).json({ error: 'Unauthorized' });
    
    // Find admin by id
    const admin = await prisma.admin.findUnique({
      where: { id: adminId }
    });
    
    if (!admin) return res.status(404).json({ error: 'Admin not found' });
    
    // Check current password
    const valid = await bcrypt.compare(currentPassword, admin.password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    
    // Validate new password (min 8 chars)
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }
    
    // Hash and update
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.admin.update({
      where: { id: admin.id },
      data: { password: hashed }
    });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const adminSignupSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(8)
});

export const adminSignup = async (req: Request, res: Response) => {
  try {
    const parsed = adminSignupSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({
      error: parsed.error.errors
    });
    
    const { username, password } = parsed.data;
    
    const existing = await prisma.admin.findUnique({
      where: { username }
    });
    
    if (existing) return res.status(409).json({ error: 'Username already exists' });
    
    const hashed = await bcrypt.hash(password, 10);
    const admin = await prisma.admin.create({
      data: { username, password: hashed }
    });
    
    res.status(201).json({ id: admin.id, username: admin.username });
  } catch (err) {
    console.error('Admin signup error:', err);
    res.status(500).json({ error: 'Server error try again' });
  }
};

export default {
  adminLogin,
  listUsers,
  toggleActive,
  resetLimits,
  updateRole,
  updateUserPlan,
  adminSignup,
  toggleUserPlan,
  updateAdminPassword
};
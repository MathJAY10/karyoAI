import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { OAuth2Client } from 'google-auth-library';

const passwordMinLength = 8;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const signupSchema = z.object({
    username: z.string()
      .min(6, { message: 'Username must be at least 6 characters.' })
      .max(32)
      .regex(/^[a-zA-Z0-9]+$/, { message: 'Username must contain only letters and numbers.' }),
    email: z.string().email(),
    password: z.string().min(passwordMinLength, {
        message: 'Password must be 8 characters or more.'
    }),
    plan: z.enum(['Free', 'Paid']).optional()
});

/**
 * @swagger
 * /api/user/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 32
 *                 pattern: '^[a-zA-Z0-9]+$'
 *                 description: Username must contain only letters and numbers
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 description: Password must be at least 8 characters
 *               plan:
 *                 type: string
 *                 enum: [Free, Paid]
 *                 default: Free
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     plan:
 *                       type: string
 *                 accessToken:
 *                   type: string
 *       400:
 *         description: Invalid input data
 *       409:
 *         description: Email or username already exists
 *       500:
 *         description: Server error
 */
export const signup = async (req: Request, res: Response) => {
    try {
        const parsed = signupSchema.safeParse(req.body);
        if (!parsed.success) {
            // Only return string error messages
            const passwordError = parsed.error.errors.find(e => e.path[0] === 'password' && e.code === 'too_small');
            if (passwordError) {
                return res.status(400).json({
                    error: 'Password must be 8 characters or more.'
                });
            }
            // Return only the message for the first error
            return res.status(400).json({
                error: parsed.error.errors[0]?.message || 'Invalid input'
            });
        }
        const { username, email, password, plan } = parsed.data;
        
        // Check if email exists
        const existingEmail = await prisma.user.findUnique({
            where: { email }
        });
        if (existingEmail) return res.status(409).json({
            error: 'Email already registered'
        });
        
        // Check if username exists
        const existingUsername = await prisma.user.findUnique({
            where: { username }
        });
        if (existingUsername) return res.status(409).json({
            error: 'username already taken'
        });
        
        const hashed = await bcrypt.hash(password, 10);
        const now = new Date();
        const expiry = plan === 'Paid' ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
        
        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hashed,
                role: 'USER',
                subscriptionStart: now,
                expiry,
                plan: plan || 'Free',
                active: true,
                messageLimit: 50,
                emailLimit: 50
            }
        });
        
        // Generate JWT like login
        const accessSecret = process.env.JWT_ACCESS_SECRET as string;
        const accessToken = jwt.sign({
            id: user.id,
            role: 'user',
            username: user.username
        }, accessSecret, {
            expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '1h') as any
        });
        
        res.status(201).json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                plan: user.plan
            },
            accessToken
        });
    } catch (err) {
        res.status(500).json({
            error: 'Server error'
        });
    }
};

const loginSchema = z.object({
    email: z.string().email().optional(),
    username: z.string()
      .min(6, { message: 'Username must be at least 6 characters.' })
      .max(32)
      .regex(/^[a-zA-Z0-9]+$/, { message: 'Username must contain only letters and numbers.' })
      .optional(),
    password: z.string().min(passwordMinLength, {
        message: 'Password must be 8 characters or more.'
    })
});

export const login = async (req: Request, res: Response) => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            // Only return string error messages
            const passwordError = parsed.error.errors.find(e => e.path[0] === 'password' && e.code === 'too_small');
            if (passwordError) {
                return res.status(400).json({
                    error: 'Password must be 8 characters or more.'
                });
            }
            // Return only the message for the first error
            return res.status(400).json({
                error: parsed.error.errors[0]?.message || 'Invalid input'
            });
        }
        const { email, username, password } = parsed.data;
        
        let user;
        if (email) {
            user = await prisma.user.findUnique({
                where: { email }
            });
            if (!user) return res.status(401).json({
                error: 'No user found with this email'
            });
            if (!user.password) return res.status(401).json({ error: 'No password set for this user' });
            const valid = await bcrypt.compare(password, user.password);
            if (!valid) return res.status(401).json({
                error: 'Invalid credentials'
            });
        } else if (username) {
            user = await prisma.user.findUnique({
                where: { username }
            });
            if (!user) return res.status(401).json({
                error: 'No user found with this username'
            });
        } else {
            return res.status(400).json({
                error: 'Email or username required'
            });
        }
        
        const accessSecret = process.env.JWT_ACCESS_SECRET as string;
        const refreshSecret = process.env.JWT_REFRESH_SECRET as string;
        const accessToken = jwt.sign({
            id: user.id,
            role: user.role,
            username: user.username
        }, accessSecret, {
            expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '1h') as any
        });
        const refreshToken = jwt.sign({
            id: user.id,
            role: user.role,
            username: user.username
        }, refreshSecret, {
            expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any
        });
        
        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                plan: user.plan
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

const refreshSchema = z.object({
    refreshToken: z.string()
});

export const refreshToken = (req: Request, res: Response) => {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({
        error: parsed.error.errors[0] && parsed.error.errors[0].message ? parsed.error.errors[0].message : 'Invalid input'
    });
    const { refreshToken } = parsed.data;
    const accessSecret = process.env.JWT_ACCESS_SECRET as string;
    const refreshSecret = process.env.JWT_REFRESH_SECRET as string;
    jwt.verify(refreshToken, refreshSecret, (err, decoded) => {
        if (err || !decoded || typeof decoded === 'string') return res.status(401).json({
            error: 'Invalid refresh token'
        });
        // decoded is JwtPayload
        const accessToken = jwt.sign({
            id: (decoded as JwtPayload).id,
            role: (decoded as JwtPayload).role,
            username: (decoded as JwtPayload).username
        }, accessSecret, {
            expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '1h') as any
        });
        res.json({
            accessToken
        });
    });
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userJwt = req.user as JwtPayload;
    if (!userJwt || typeof userJwt !== 'object' || !userJwt.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userJwt.id }
    });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Exclude password
    const { password, ...userData } = user;
    res.json({ user: userData });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const changePasswordSchema = z.object({
  oldPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

export const changePassword = async (req: Request, res: Response) => {
  try {
    const userJwt = req.user as JwtPayload;
    if (!userJwt || typeof userJwt !== 'object' || !userJwt.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || 'Invalid input' });
    }
    
    const { oldPassword, newPassword } = parsed.data;
    
    const user = await prisma.user.findUnique({
      where: { id: userJwt.id }
    });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.password) return res.status(401).json({ error: 'No password set for this user' });
    const valid = await bcrypt.compare(oldPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Old password is incorrect' });
    
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed }
    });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

export const getUserLimits = async (req: Request, res: Response) => {
  try {
    const userJwt = req.user as JwtPayload;
    if (!userJwt || typeof userJwt !== 'object' || !userJwt.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userJwt.id },
      select: {
        messageLimit: true,
        emailLimit: true,
        plan: true,
        subscriptionStart: true,
        expiry: true
      }
    });
    
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({
      messageLimit: user.messageLimit,
      emailLimit: user.emailLimit,
      plan: user.plan,
      subscriptionStart: user.subscriptionStart,
      expiry: user.expiry
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Google OAuth methods
const googleLoginSchema = z.object({
  idToken: z.string()
});

export const googleLogin = async (req: Request, res: Response) => {
  try {
    const parsed = googleLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid token' });
    }
    
    const { idToken } = parsed.data;
    
    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ error: 'Invalid Google token' });
    }
    
    const { sub: googleId, email, name, picture } = payload;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    // Check if user exists with this Google ID
    let user = await prisma.user.findUnique({
      where: { googleId }
    });
    
    if (!user) {
      // Check if user exists with this email
      user = await prisma.user.findUnique({
        where: { email }
      });
      
      if (user) {
        // Update existing user with Google ID
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId }
        });
      } else {
        // Create new user
        const username = name?.replace(/\s+/g, '').toLowerCase() || email.split('@')[0];
        let finalUsername = username;
        let counter = 1;
        
        // Ensure unique username
        while (await prisma.user.findUnique({ where: { username: finalUsername } })) {
          finalUsername = `${username}${counter}`;
          counter++;
        }
        
        const now = new Date();
        user = await prisma.user.create({
          data: {
            username: finalUsername,
            email,
            googleId,
            role: 'USER',
            subscriptionStart: now,
            plan: 'Free',
            active: true,
            messageLimit: 50,
            emailLimit: 50
          }
        });
      }
    }
    
    // Generate JWT tokens
    const accessSecret = process.env.JWT_ACCESS_SECRET as string;
    const refreshSecret = process.env.JWT_REFRESH_SECRET as string;
    
    const accessToken = jwt.sign({
      id: user.id,
      role: user.role,
      username: user.username
    }, accessSecret, {
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '1h') as any
    });
    
    const refreshToken = jwt.sign({
      id: user.id,
      role: user.role,
      username: user.username
    }, refreshSecret, {
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any
    });
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        plan: user.plan
      },
      accessToken,
      refreshToken
    });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(500).json({ error: 'Google authentication failed' });
  }
};

export const updateUserLimit = async (req: Request, res: Response) => {
  try {
    const userJwt = req.user as JwtPayload;
    if (!userJwt || typeof userJwt !== 'object' || !userJwt.id) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { limitType } = req.body; // 'message' or 'email'
    
    if (!limitType || !['message', 'email'].includes(limitType)) {
      return res.status(400).json({ error: 'Invalid limit type. Must be "message" or "email"' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userJwt.id },
      select: { 
        messageLimit: true, 
        emailLimit: true, 
        plan: true 
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if limit is already exhausted
    const currentLimit = limitType === 'message' ? user.messageLimit : user.emailLimit;
    if (currentLimit <= 0) {
      return res.status(429).json({ 
        error: `${limitType} limit exceeded`,
        message: `You have reached your ${limitType} limit. Please upgrade to continue using the service.`
      });
    }

    // Decrement the appropriate limit
    const updateData = limitType === 'message' 
      ? { messageLimit: user.messageLimit - 1 }
      : { emailLimit: user.emailLimit - 1 };

    const updatedUser = await prisma.user.update({
      where: { id: userJwt.id },
      data: updateData,
      select: { 
        messageLimit: true, 
        emailLimit: true, 
        plan: true 
      }
    });

    res.json({ 
      success: true,
      [limitType === 'message' ? 'messageLimit' : 'emailLimit']: updatedUser[limitType === 'message' ? 'messageLimit' : 'emailLimit'],
      plan: updatedUser.plan
    });
  } catch (error) {
    console.error('Update user limit error:', error);
    res.status(500).json({ error: 'Failed to update user limit' });
  }
};

export default { signup, login, refreshToken, getCurrentUser, changePassword, googleLogin, getUserLimits, updateUserLimit };
import { PrismaClient, Plan, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  plan?: string; // Accept string, cast to Plan
}

export interface UserResponse {
  id: number;
  username: string;
  email: string;
  role: string;
  plan: string;
  active: boolean;
  messageLimit: number;
  emailLimit: number;
  createdAt: Date;
}

export class UserService {
  static async createUser(data: CreateUserData): Promise<UserResponse> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const now = new Date();
    const expiry = data.plan === 'Paid' ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : null;

    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
        role: 'USER',
        subscriptionStart: now,
        expiry,
        plan: data.plan ? (data.plan as Plan) : Plan.Free,
        active: true,
        messageLimit: 100,
        emailLimit: 50,
      },
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      plan: user.plan,
      active: user.active,
      messageLimit: user.messageLimit,
      emailLimit: user.emailLimit,
      createdAt: user.createdAt,
    };
  }

  static async findByEmail(email: string): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      plan: user.plan,
      active: user.active,
      messageLimit: user.messageLimit,
      emailLimit: user.emailLimit,
      createdAt: user.createdAt,
    };
  }

  static async findByUsername(username: string): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      plan: user.plan,
      active: user.active,
      messageLimit: user.messageLimit,
      emailLimit: user.emailLimit,
      createdAt: user.createdAt,
    };
  }

  static async findById(id: number): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      plan: user.plan,
      active: user.active,
      messageLimit: user.messageLimit,
      emailLimit: user.emailLimit,
      createdAt: user.createdAt,
    };
  }

  static async verifyPassword(user: any, password: string): Promise<boolean> {
    if (!user.password) return false;
    return bcrypt.compare(password, user.password);
  }

  static async updateUser(id: number, data: Partial<UserResponse>): Promise<UserResponse | null> {
    // Remove id from data
    const { id: _id, ...rest } = data;
    // Build updateData with correct types
    const updateData: any = {};
    if (rest.username !== undefined) updateData.username = rest.username;
    if (rest.email !== undefined) updateData.email = rest.email;
    if (rest.role !== undefined) updateData.role = rest.role as UserRole;
    if (rest.plan !== undefined) updateData.plan = rest.plan as Plan;
    if (rest.active !== undefined) updateData.active = rest.active;
    if (rest.messageLimit !== undefined) updateData.messageLimit = rest.messageLimit;
    if (rest.emailLimit !== undefined) updateData.emailLimit = rest.emailLimit;
    if (rest.createdAt !== undefined) updateData.createdAt = rest.createdAt;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      plan: user.plan,
      active: user.active,
      messageLimit: user.messageLimit,
      emailLimit: user.emailLimit,
      createdAt: user.createdAt,
    };
  }
} 
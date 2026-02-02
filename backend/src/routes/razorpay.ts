import express from 'express';
import Razorpay from 'razorpay';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middlewares/auth';
import { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';

const router = express.Router();

// SECURITY FIX: Define valid plans to prevent amount manipulation
interface PlanConfig {
  id: string;
  name: string;
  amount: number;
  currency: string;
  duration: number; // days
  messageLimit: number;
  emailLimit: number;
}

const VALID_PLANS: Record<string, PlanConfig> = {
  premium: { 
    id: 'premium',
    name: 'Premium Plan', 
    amount: 5666, 
    currency: 'INR',
    duration: 30,
    messageLimit: 1000,
    emailLimit: 500
  }
};

const orderSchema = z.object({
  plan: z.string().refine((plan) => Object.keys(VALID_PLANS).includes(plan), {
    message: 'Invalid plan specified'
  }),
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const paymentSchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  amount: z.number().min(1),
  status: z.string(),
  paid_at: z.string().optional(),
});

const verifySchema = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  amount: z.number().min(1),
  currency: z.string(),
});

router.post('/create-order', async (req, res) => {
  try {
    const { plan } = req.body;

    if (!plan || typeof plan !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing plan' });
    }

    // SECURITY FIX: Get amount from server-side plan definition
    const selectedPlan = VALID_PLANS[plan as keyof typeof VALID_PLANS];
    if (!selectedPlan) {
      console.error(`Invalid plan attempted: ${plan}`);
      return res.status(400).json({ error: 'Invalid plan specified' });
    }

    const options = {
      amount: selectedPlan.amount * 100, // ₹5666 becomes 566600 paise
      currency: selectedPlan.currency,
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    // ARCHITECTURE IMPROVEMENT: Persist order with plan for later verification
    try {
      await prisma.razorpayOrder.create({
        data: {
          orderId: order.id,
          amount: selectedPlan.amount,
          planId: selectedPlan.id,
        }
      });
    } catch (persistErr: any) {
      // If we fail to persist, don't expose details to client
      console.error('Failed to persist Razorpay order:', {
        error: persistErr.message,
        stack: persistErr.stack,
        orderId: order.id,
        plan: selectedPlan.id,
      });
      return res.status(500).json({ error: 'Failed to create payment order' });
    }

    return res.status(200).json(order);
  } catch (err: any) {
    // SECURITY FIX: Log detailed error server-side, return generic message to client
    console.error('Order creation failed:', {
      error: err.message,
      stack: err.stack,
      plan: req.body.plan
    });
    return res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// ARCHITECTURE IMPROVEMENT: Removed redundant /record-payment route
// All payment processing now goes through /verify-payment for consistency

router.post('/verify-payment', authenticate, async (req, res) => {
  const parse = verifySchema.safeParse(req.body);
  if (!parse.success) {
    // SECURITY FIX: Don't expose validation details to client
    console.error('Invalid verification request:', parse.error.errors);
    return res.status(400).json({ error: 'Invalid request' });
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency } = parse.data;
  const userJwt = req.user as import('jsonwebtoken').JwtPayload;
  const user_id = userJwt && typeof userJwt === 'object' && 'id' in userJwt ? (userJwt.id as number) : undefined;
  if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

  // 1. Verify signature
  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(razorpay_order_id + '|' + razorpay_payment_id)
    .digest('hex');

  if (generated_signature !== razorpay_signature) {
    return res.status(400).json({ error: 'Invalid payment signature' });
  }

  // ARCHITECTURE + SECURITY: Fetch order record and validate amount/plan
  const orderRecord = await prisma.razorpayOrder.findUnique({
    where: { orderId: razorpay_order_id }
  });

  if (!orderRecord) {
    console.error('Order not found for verification:', { orderId: razorpay_order_id });
    return res.status(400).json({ error: 'Invalid order' });
  }

  // Validate amount (backend stores amount in currency units; Razorpay sends paise)
  if (orderRecord.amount * 100 !== amount) {
    console.error('Amount mismatch during verification:', {
      orderId: razorpay_order_id,
      expectedPaise: orderRecord.amount * 100,
      receivedPaise: amount,
    });
    return res.status(400).json({ error: 'Invalid payment amount' });
  }

  // SECURITY FIX: Check for duplicate payment before processing
  const existingPayment = await prisma.payment.findUnique({
    where: { razorpayOrderId: razorpay_order_id }
  });

  if (existingPayment) {
    console.error(`Duplicate payment attempt for order: ${razorpay_order_id}`);
    return res.status(400).json({ error: 'Payment already processed' });
  }

  // 2. Insert payment into payments table and update user plan atomically
  const paid_at = new Date();
  try {
    // SECURITY FIX: Use database transaction to ensure atomicity
    const payment = await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.payment.create({
        data: {
          userId: user_id,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          amount,
          plan: orderRecord.planId, // Track which plan was purchased, from persisted order
          status: 'completed',
          paidAt: paid_at,
        }
      });

      // ARCHITECTURE IMPROVEMENT: Use plan configuration for subscription based on order
      const selectedPlan = VALID_PLANS[orderRecord.planId as keyof typeof VALID_PLANS];
      const expiryDate = new Date(paid_at.getTime() + selectedPlan.duration * 24 * 60 * 60 * 1000);
      
      // Update user plan to Paid
      await tx.user.update({
        where: { id: user_id },
        data: {
          plan: 'Paid',
          subscriptionStart: paid_at,
          expiry: expiryDate,
          messageLimit: selectedPlan.messageLimit,
          emailLimit: selectedPlan.emailLimit,
        }
      });

      return payment;
    });

    res.json({ success: true, payment });
  } catch (err: any) {
    // SECURITY FIX: Log detailed error server-side, return generic message to client
    console.error('Payment verification failed:', {
      error: err.message,
      stack: err.stack,
      orderId: razorpay_order_id,
      userId: user_id
    });
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

router.get('/payment-history', authenticate, async (req, res) => {
  const userJwt = req.user as JwtPayload;
  const user_id = userJwt && typeof userJwt === 'object' && 'id' in userJwt ? (userJwt.id as number) : undefined;
  if (!user_id) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const payments = await prisma.payment.findMany({
      where: { userId: user_id },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ payments });
  } catch (err: any) {
    // SECURITY FIX: Log detailed error server-side, return generic message to client
    console.error('Payment history fetch failed:', {
      error: err.message,
      stack: err.stack,
      userId: user_id
    });
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

export default router; 
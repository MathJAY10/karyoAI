import express from 'express';
import { chatWithPDF, getPDFChatById } from '../../controllers/pdf/pdfChatAgentController';
import { authenticate } from '../../middlewares/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

router.post('/chat', chatWithPDF);
router.get('/chat/:sessionId', getPDFChatById);

export default router; 
import express from 'express';
import { getChatHistory, getLatestChat, deleteChat } from '../../controllers/excel/excelchatController';
import { authenticate } from '../../middlewares/auth';

const router = express.Router();

// GET /api/chat/history/:chatId
router.get('/history/:chatId', authenticate, getChatHistory);

// GET /api/chat/latest?toolType=...
router.get('/latest', authenticate, getLatestChat);

// DELETE /api/chat/:chatId
router.delete('/:chatId', authenticate, deleteChat);

export default router; 
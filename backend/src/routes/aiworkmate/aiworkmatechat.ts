import express from 'express';
import multer from 'multer';
import { sendMessage, getChatHistory, createChatSession, listChats } from '../../controllers/aiworkmte/aiworkmateChatController';
import { authenticate } from '../../middlewares/auth';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
});

// Apply authentication to all routes
router.use(authenticate);

router.post('/send', upload.single('file'), sendMessage);
router.get('/history/:chatId', getChatHistory);
router.post('/create', createChatSession);
router.get('/list', listChats);

export default router; 
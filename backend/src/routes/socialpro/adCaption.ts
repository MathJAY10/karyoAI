import { Router } from 'express';
import { authenticate, checkMessageLimit } from '../../middlewares/auth';
import { sendAdCaptionChatMessage, getAdCaptionChatById, getUserAdCaptionChats } from '../../controllers/socialpro/adCaptionController';

const router = Router();

// Ad Caption Generator routes with authentication and message limit
router.post('/chat/send', authenticate, checkMessageLimit, (req, res) => {
  return sendAdCaptionChatMessage(req, res);
});

router.get('/chat/:chat_id', authenticate, (req, res) => {
  return getAdCaptionChatById(req, res);
});

router.get('/chats', authenticate, (req, res) => {
  return getUserAdCaptionChats(req, res);
});

export default router;



import { Router } from 'express';
import { sendCaptionChatMessage, getCaptionChatById, getUserCaptionChats } from '../../controllers/socialpro/captionProController';
import { authenticate, checkMessageLimit } from '../../middlewares/auth';

const router = Router();

// CaptionPro routes with authentication and message limit check
router.post('/chat/send', authenticate, checkMessageLimit, (req, res) => {
  return sendCaptionChatMessage(req, res);
});

router.get('/chat/:chat_id', authenticate, (req, res) => {
  return getCaptionChatById(req, res);
});

router.get('/chats', authenticate, (req, res) => {
  return getUserCaptionChats(req, res);
});

export default router;

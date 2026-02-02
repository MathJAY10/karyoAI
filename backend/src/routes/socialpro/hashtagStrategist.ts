import { Router } from 'express';
import { sendHashtagChatMessage, getHashtagChatById, getUserHashtagChats } from '../../controllers/socialpro/hashtagStrategistController';
import { authenticate, checkMessageLimit } from '../../middlewares/auth';

const router = Router();

// Hashtag Strategist routes with authentication and message limit check
router.post('/chat/send', authenticate, checkMessageLimit, (req, res) => {
  return sendHashtagChatMessage(req, res);
});

router.get('/chat/:chat_id', authenticate, (req, res) => {
  return getHashtagChatById(req, res);
});

router.get('/chats', authenticate, (req, res) => {
  return getUserHashtagChats(req, res);
});

export default router;

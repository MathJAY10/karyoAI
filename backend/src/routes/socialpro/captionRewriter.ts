import { Router } from 'express';
import { authenticate, checkMessageLimit } from '../../middlewares/auth';
import { sendCaptionRewriterChatMessage, getCaptionRewriterChatById, getUserCaptionRewriterChats } from '../../controllers/socialpro/captionRewriterController';

const router = Router();

// Caption Rewriter AI routes with authentication and message limit
router.post('/chat/send', authenticate, checkMessageLimit, (req, res) => {
  return sendCaptionRewriterChatMessage(req, res);
});

router.get('/chat/:chat_id', authenticate, (req, res) => {
  return getCaptionRewriterChatById(req, res);
});

router.get('/chats', authenticate, (req, res) => {
  return getUserCaptionRewriterChats(req, res);
});

export default router;

import { Router } from 'express';
import { sendMailChatMessage, getMailChatById } from '../../controllers/mailcraft/emailwizard';
import { authenticate } from '../../middlewares/auth';

const router = Router();

// Your existing routes with authentication
router.post('/chat/send', authenticate, (req, res) => {
  return sendMailChatMessage(req, res);
});

router.get('/chat/:chat_id', authenticate, (req, res) => {
  return getMailChatById(req, res);
});

export default router;
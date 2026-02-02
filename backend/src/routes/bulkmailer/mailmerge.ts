import express from 'express';
import { authenticate, checkMessageLimit } from '../../middlewares/auth';
import { clearHistory, uploadAndGenerate, getChatById, getLatestChat } from '../../controllers/bulkmailer/mailmerge';

const router = express.Router();

router.use(authenticate);

// POST /merge: merge two emails using AI
router.post('/merge', checkMessageLimit, uploadAndGenerate);
router.get('/chat/:chat_id', getChatById);
router.get('/latest', getLatestChat);
router.delete('/chats', clearHistory);

export default router;

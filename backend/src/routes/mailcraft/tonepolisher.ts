import { Router } from 'express';
import { sendTonePolisherChatMessage, getTonePolisherChatById } from '../../controllers/mailcraft/tonepolisher';
import { authenticate } from '../../middlewares/auth';

console.log('Loading mailcraft/tonepolisher router...');

const router = Router();

// Add logging middleware to see if router is being hit at all
router.use((req, res, next) => {
  console.log(`[TONE POLISHER ROUTER] ${req.method} ${req.originalUrl} - Path: ${req.path}`);
  console.log('Headers:', req.headers.authorization ? 'Auth header present' : 'No auth header');
  next();
});

// Add a test route WITHOUT authentication to verify router mounting
router.get('/test', (req, res) => {
  console.log('Test route hit - router is mounted correctly');
  res.json({ 
    message: 'Tone Polisher router is working!',
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
});

// Your existing routes with authentication
router.post('/chat/send', authenticate, (req, res) => {
  console.log('POST /chat/send hit after authentication');
  return sendTonePolisherChatMessage(req, res);
});

router.get('/chat/:chat_id', authenticate, (req, res) => {
  console.log('GET /chat/:chat_id hit after authentication');
  return getTonePolisherChatById(req, res);
});

console.log('Tone polisher router setup complete');

export default router;
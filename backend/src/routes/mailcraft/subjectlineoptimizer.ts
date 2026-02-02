import { Router } from 'express';
import { sendSubjectLineChatMessage, getSubjectLineChatById } from '../../controllers/mailcraft/subjectlineoptimizer';
import { authenticate } from '../../middlewares/auth';

console.log('Loading mailcraft/subjectlineoptimizer router...');

const router = Router();

// Add logging middleware to see if router is being hit at all
router.use((req, res, next) => {
  console.log(`[SUBJECT LINE OPTIMIZER ROUTER] ${req.method} ${req.originalUrl} - Path: ${req.path}`);
  console.log('Headers:', req.headers.authorization ? 'Auth header present' : 'No auth header');
  next();
});

// Add a test route WITHOUT authentication to verify router mounting
router.get('/test', (req, res) => {
  console.log('Test route hit - router is mounted correctly!');
  res.json({ 
    message: 'Subject line optimizer router is working!',
    timestamp: new Date().toISOString(),
    path: req.path,
    originalUrl: req.originalUrl
  });
});

// Your existing routes with authentication
router.post('/chat/send', authenticate, (req, res) => {
  console.log('POST /chat/send hit after authentication');
  return sendSubjectLineChatMessage(req, res);
});

router.get('/chat/:chat_id', authenticate, (req, res) => {
  console.log('GET /chat/:chat_id hit after authentication');
  return getSubjectLineChatById(req, res);
});

console.log('Subject line optimizer router setup complete');

export default router;

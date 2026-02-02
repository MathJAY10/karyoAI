import express from 'express';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

router.use(authenticate);

// Example: List premium tools for the user
router.get('/tools', (req, res) => {
    // In production, check user plan/role and return allowed tools
    res.json({
        tools: ['Excel Genius Suite', 'PDF Intelligence Hub', 'AI Workmate', 'MailCraft AI', 'Social Pro Toolkit', 'SmartDocs Generator', 'DataFill AI', 'BulkMailer Pro']
    });
});

export default router;
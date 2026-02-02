import express from 'express';
import { addPrompt, listMyPrompts, listPublicPrompts, deletePrompt } from '../../controllers/aiworkmte/promptController';
import { authenticate } from '../../middlewares/auth';

const router = express.Router();

router.post('/', authenticate, addPrompt);
router.get('/my', authenticate, listMyPrompts);
router.get('/public', listPublicPrompts);
router.delete('/:id', authenticate, deletePrompt);

export default router; 
import express from 'express';
import { authenticate, checkMessageLimit } from '../../middlewares/auth';
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  aiEditTemplate,
  getUserTemplateTitles,
} from '../../controllers/bulkmailer/smartTemplatesController';

const router = express.Router();

// list templates (include public for authenticated users)
router.get('/', authenticate, checkMessageLimit, listTemplates);
router.get('/:id', authenticate, checkMessageLimit, getTemplate);
router.post('/', authenticate, checkMessageLimit, createTemplate);
router.patch('/:id', authenticate, checkMessageLimit, updateTemplate);
router.delete('/:id', authenticate, checkMessageLimit, deleteTemplate);
// AI edit: POST /ai-edit or POST /ai-edit/:id
router.post('/ai-edit/:id?', authenticate, checkMessageLimit, aiEditTemplate);
router.get('/titles/user', authenticate, checkMessageLimit, getUserTemplateTitles);

export default router;

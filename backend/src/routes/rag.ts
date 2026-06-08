import { Router } from 'express';
import multer from 'multer';
import { uploadDocument, getDocumentStatus } from '../controllers/documentController';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Async Upload Pipeline
router.post('/workspaces/:workspaceId/documents', upload.single('file'), uploadDocument);

// Polling Pipeline
router.get('/documents/:id/status', getDocumentStatus);

export default router;

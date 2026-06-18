import { Router } from 'express';
import multer from 'multer';
import { uploadDocument, getDocumentStatus, getReadyDocuments } from '../controllers/documentController';
import { authenticate } from '../middlewares/auth';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Async Upload Pipeline
router.post('/workspaces/:workspaceId/documents', authenticate, upload.single('file'), uploadDocument);

// Polling Pipeline
router.get('/documents/:id/status', getDocumentStatus);

// Fetch Ready Documents for Chat Hub
router.get('/documents/ready', authenticate, getReadyDocuments);

export default router;

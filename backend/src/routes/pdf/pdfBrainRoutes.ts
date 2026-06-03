import express from 'express';
import multer from 'multer';
import { analyzePDF, getAnalyzePDFJob } from '../../controllers/pdf/pdfBrainController';
import { authenticate } from '../../middlewares/auth';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// POST /api/pdf/brain/analyze
router.post('/analyze',authenticate, upload.single('pdf'), analyzePDF);

// GET /api/pdf/brain/jobs/:jobId
router.get('/jobs/:jobId', authenticate, getAnalyzePDFJob);

export default router; 
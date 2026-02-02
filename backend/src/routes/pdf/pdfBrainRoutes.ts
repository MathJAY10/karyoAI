import express from 'express';
import multer from 'multer';
import { analyzePDF } from '../../controllers/pdf/pdfBrainController';
import { authenticate } from '../../middlewares/auth';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// POST /api/pdf/brain/analyze
router.post('/analyze',authenticate, upload.single('pdf'), analyzePDF);

export default router; 
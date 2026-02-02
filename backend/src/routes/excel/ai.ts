import express from 'express';
import multer from 'multer';
import { analyzeExcel } from '../../controllers/excel/excelaiController';
import { authenticate } from '../../middlewares/auth';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Apply authentication to all routes
router.use(authenticate);

router.post('/analyze-excel', upload.single('file'), analyzeExcel);

export default router; 
import express from 'express';
import multer from 'multer';
import { 
  analyzeExcelForErrorsAndTrends, 
  getAnalysisById, 
  getLatestAnalysis, 
  deleteAnalysis 
} from '../../controllers/excel/errorTrendController';
import { authenticate } from '../../middlewares/auth';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  limits: { 
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check file extension
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  }
});

// POST /api/error-trend/analyze - Analyze Excel file for errors and trends
router.post('/analyze', authenticate, upload.single('file'), analyzeExcelForErrorsAndTrends);

// GET /api/error-trend/analysis/:id - Get analysis by ID
router.get('/analysis/:id', authenticate, getAnalysisById);

// GET /api/error-trend/latest - Get latest analysis for user
router.get('/latest', authenticate, getLatestAnalysis);

// DELETE /api/error-trend/analysis/:id - Delete analysis
router.delete('/analysis/:id', authenticate, deleteAnalysis);

export default router; 
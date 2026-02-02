import express from 'express';
import multer from 'multer';
import { chatWithPDF, getPDFChatById } from '../../controllers/pdf/pdfChatAgentController';
import { authenticate } from '../../middlewares/auth';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + '.pdf');
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Apply authentication to all routes
router.use(authenticate);

router.post('/chat', upload.array('files', 5), chatWithPDF);
router.get('/chat/:chat_id', getPDFChatById);

export default router; 
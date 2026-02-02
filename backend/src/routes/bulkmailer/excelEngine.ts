import express from 'express';
import multer from 'multer';
import { authenticate, checkMessageLimit } from '../../middlewares/auth';
import { clearHistory, uploadAndGenerate, getChatById, getLatestChat } from '../../controllers/bulkmailer/excelEngineController';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls'];
    const name = file.originalname.toLowerCase();
    if (allowedExtensions.some(ext => name.endsWith(ext))) cb(null, true);
    else cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
  }
});

router.use(authenticate);

router.post('/upload-and-generate', checkMessageLimit, upload.single('file'), uploadAndGenerate);
router.get('/chat/:chat_id', getChatById);
router.get('/latest', getLatestChat);
router.delete('/chats', clearHistory);

export default router;



import express from 'express';
import multer from 'multer';
import { getSessionById, uploadAndExtract } from '../../controllers/pdf/smartDataExtractorController';
import { authenticate, checkMessageLimit } from '../../middlewares/auth';

const router = express.Router();

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

router.use(authenticate);

router.post('/upload-and-extract', checkMessageLimit, upload.array('files', 5), uploadAndExtract);
router.get('/session/:id', getSessionById);

export default router;

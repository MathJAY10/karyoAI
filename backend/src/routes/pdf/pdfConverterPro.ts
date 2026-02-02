import express from 'express';
import multer from 'multer';
import {
  convertPdfToExcel,
  convertPdfToCsv,
  convertPdfToWord,
} from '../../controllers/pdf/pdfConverterProController';

const router = express.Router();
const upload = multer();

router.post('/to-excel', upload.single('file'), convertPdfToExcel);
router.post('/to-csv', upload.single('file'), convertPdfToCsv);
router.post('/to-word', upload.single('file'), convertPdfToWord);

export default router;


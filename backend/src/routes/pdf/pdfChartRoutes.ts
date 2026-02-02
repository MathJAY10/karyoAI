import express from 'express';
import multer from 'multer';
import { pdfPagesToImages, suggestChart } from '../../controllers/pdf/pdfChartController';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/pages-to-images', upload.single('pdf'), pdfPagesToImages);
router.post('/suggest-chart', express.json(), suggestChart);

export default router; 
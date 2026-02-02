import express from 'express';
import { explainFormula } from '../../controllers/excel/excelaiFormulaController';
import { authenticate } from '../../middlewares/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

router.post('/explain', explainFormula);

export default router;
import express from 'express';
import { authenticate } from '../../middlewares/auth';
import {
  createSmartInvoice,
  getSmartInvoices,
  getSmartInvoiceById,
  updateSmartInvoice,
  deleteSmartInvoice,
} from '../../controllers/smartdocs/smartInvoiceController';

const router = express.Router();

router.use(authenticate);

router.post('/', createSmartInvoice);          // POST /api/smartdocs/smart-invoices
router.get('/', getSmartInvoices);            // GET  /api/smartdocs/smart-invoices
router.get('/:id', getSmartInvoiceById);       // GET  /api/smartdocs/smart-invoices/:id
router.put('/:id', updateSmartInvoice);        // PUT  /api/smartdocs/smart-invoices/:id
router.delete('/:id', deleteSmartInvoice);      // DELETE /api/smartdocs/smart-invoices/:id

export default router;

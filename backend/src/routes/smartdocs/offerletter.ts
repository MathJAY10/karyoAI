import express from 'express';
import { authenticate } from '../../middlewares/auth';
import { createOfferLetter, listOfferLetters, getOfferLetter } from '../../controllers/smartdocs/offerLetterController';

const router = express.Router();

router.use(authenticate);

router.post('/', createOfferLetter);         // POST /api/smartdocs/offer-letters
router.get('/', listOfferLetters);           // GET  /api/smartdocs/offer-letters
router.get('/:id', getOfferLetter);          // GET  /api/smartdocs/offer-letters/:id

export default router;




import express from 'express';
import userController from '../controllers/userController';
import { authenticate } from '../middlewares/auth';

const router = express.Router();

// Auth routes (to be implemented in userController)
router.post('/signup', userController.signup);
router.post('/login', userController.login);
router.post('/google', userController.googleLogin);
router.post('/refresh', userController.refreshToken);
router.post('/change-password', authenticate, userController.changePassword);

// Example public route
router.get('/', (req, res) => {
    res.json({
        message: 'User route working'
    });
});

router.get('/me', authenticate, userController.getCurrentUser);
router.get('/limits', authenticate, userController.getUserLimits);
router.post('/update-limit', authenticate, userController.updateUserLimit);

export default router;
import express from 'express';
import adminController from '../controllers/adminController';
import { authenticate, requireRole } from '../middlewares/auth';

const router = express.Router();

// Public route (no auth)
router.post('/login', adminController.adminLogin);
router.post('/signup', adminController.adminSignup);

// Protected admin routes
router.get('/users', authenticate, requireRole('admin'), adminController.listUsers);
router.patch('/users/:id/activate', authenticate, requireRole('admin'), adminController.toggleActive);
router.patch('/users/:id/reset-limits', authenticate, requireRole('admin'), adminController.resetLimits);
router.patch('/users/:id/role', authenticate, requireRole('admin'), adminController.updateRole);
router.patch('/users/:id/plan', authenticate, requireRole('admin'), adminController.updateUserPlan);
router.patch('/users/:id/toggle-plan', authenticate, requireRole('admin'), adminController.toggleUserPlan);
router.patch('/password', authenticate, requireRole('admin'), adminController.updateAdminPassword);

export default router;
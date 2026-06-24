import { Router } from 'express';
import { NotificationController } from './notification.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const controller = new NotificationController();

// Secure notifications routes
router.use(authenticate);

router.get('/', controller.list);
router.patch('/read-all', controller.markAllAsRead);
router.patch('/:id/read', controller.markAsRead);
router.delete('/:id', controller.delete);

export default router;

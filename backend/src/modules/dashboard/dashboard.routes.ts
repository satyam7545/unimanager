import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const controller = new DashboardController();

router.use(authenticate);

router.get('/', controller.getSummary);

export default router;

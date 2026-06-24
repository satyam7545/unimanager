import { Router } from 'express';
import { HabitController } from './habit.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const controller = new HabitController();

router.use(authenticate);

router.get('/', controller.getAll);
router.post('/', controller.create);
router.post('/:id/toggle', controller.toggle);
router.delete('/:id', controller.delete);

export default router;

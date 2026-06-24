import { Router } from 'express';
import { TaskController } from './task.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { createTaskSchema, updateTaskSchema } from './task.schemas';

const router = Router();
const controller = new TaskController();

router.use(authenticate);

router.get('/', controller.getAll);
router.post('/', validateRequest(createTaskSchema), controller.create);
router.get('/:id', controller.getById);
router.put('/:id', validateRequest(updateTaskSchema), controller.update);
router.delete('/:id', controller.delete);

export default router;

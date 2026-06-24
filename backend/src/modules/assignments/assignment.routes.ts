import { Router } from 'express';
import { AssignmentController } from './assignment.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { createAssignmentSchema, updateAssignmentSchema } from './assignment.schemas';

const router = Router();
const controller = new AssignmentController();

router.use(authenticate);

router.get('/', controller.getAll);
router.post('/', validateRequest(createAssignmentSchema), controller.create);
router.get('/:id', controller.getById);
router.put('/:id', validateRequest(updateAssignmentSchema), controller.update);
router.delete('/:id', controller.delete);

export default router;

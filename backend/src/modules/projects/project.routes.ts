import { Router } from 'express';
import { ProjectController } from './project.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { createProjectSchema, updateProjectSchema } from './project.schemas';

const router = Router();
const controller = new ProjectController();

router.use(authenticate);

router.get('/', controller.getAll);
router.post('/', validateRequest(createProjectSchema), controller.create);
router.get('/:id', controller.getById);
router.put('/:id', validateRequest(updateProjectSchema), controller.update);
router.delete('/:id', controller.delete);

export default router;

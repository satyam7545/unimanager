import { Router } from 'express';
import { SubjectController } from './subject.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { createSubjectSchema, updateSubjectSchema } from './subject.schemas';

const router = Router();
const controller = new SubjectController();

// All subject routes require login authentication
router.use(authenticate);

router.get('/', controller.getAll);
router.post('/', validateRequest(createSubjectSchema), controller.create);
router.get('/:id', controller.getById);
router.put('/:id', validateRequest(updateSubjectSchema), controller.update);
router.delete('/:id', controller.delete);

export default router;

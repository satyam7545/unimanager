import { Router } from 'express';
import { EventController } from './event.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { createEventSchema, updateEventSchema } from './event.schemas';

const router = Router();
const controller = new EventController();

router.use(authenticate);

router.get('/', controller.getAll);
router.post('/', validateRequest(createEventSchema), controller.create);
router.get('/:id', controller.getById);
router.put('/:id', validateRequest(updateEventSchema), controller.update);
router.delete('/:id', controller.delete);

export default router;

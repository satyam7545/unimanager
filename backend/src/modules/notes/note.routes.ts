import { Router } from 'express';
import { NoteController } from './note.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { createNoteSchema, updateNoteSchema } from './note.schemas';

const router = Router();
const controller = new NoteController();

router.use(authenticate);

router.get('/', controller.getAll);
router.post('/', validateRequest(createNoteSchema), controller.create);
router.get('/:id', controller.getById);
router.put('/:id', validateRequest(updateNoteSchema), controller.update);
router.delete('/:id', controller.delete);

export default router;

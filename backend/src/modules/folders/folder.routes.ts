import { Router } from 'express';
import { FolderController } from './folder.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const controller = new FolderController();

router.use(authenticate);

router.get('/', controller.getAll);
router.post('/', controller.create);
router.delete('/:id', controller.delete);

export default router;

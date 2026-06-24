import { Router } from 'express';
import { AttachmentController } from './attachment.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { attachmentUpload } from '../../middleware/attachment-upload.middleware';

const router = Router();
const controller = new AttachmentController();

router.use(authenticate);

router.post('/upload', attachmentUpload.single('file'), controller.upload);
router.delete('/:id', controller.delete);

export default router;

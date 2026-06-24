import { Router } from 'express';
import { BackupController } from './backup.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const controller = new BackupController();

// Secure backup routes
router.use(authenticate);

router.get('/export', controller.exportBackup);
router.post('/import', controller.importBackup);

export default router;

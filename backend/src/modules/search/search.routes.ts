import { Router } from 'express';
import { SearchController } from './search.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const controller = new SearchController();

router.use(authenticate);

router.get('/', controller.search);

export default router;

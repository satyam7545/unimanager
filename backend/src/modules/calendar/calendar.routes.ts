import { Router } from 'express';
import { CalendarController } from './calendar.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
const controller = new CalendarController();

router.use(authenticate);

router.get('/events', controller.getEvents);

export default router;

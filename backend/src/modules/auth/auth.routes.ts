import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { rateLimiter } from '../../middleware/rateLimit.middleware';
import { registerSchema, loginSchema } from './auth.schemas';

const router = Router();
const controller = new AuthController();

// Limit auth attempts to 5 requests per 15 minutes per IP
const authLimiter = rateLimiter(5, 15 * 60 * 1000);

router.post('/register', authLimiter, validateRequest(registerSchema), controller.register);
router.post('/login', authLimiter, validateRequest(loginSchema), controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
router.get('/me', authenticate, controller.me);
router.put('/profile', authenticate, controller.updateProfile);

export default router;

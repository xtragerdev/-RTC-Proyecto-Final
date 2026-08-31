import { Router } from 'express';
import rateLimit from 'express-rate-limit';

import { login, me, register } from '../controllers/authController.js';
import { deleteMe, updateMe } from '../controllers/userController.js';
import { requireAuth } from '../middlewares/auth.js';
import { uploadImage } from '../middlewares/upload.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loginSchema, registerSchema } from '../validators/authSchemas.js';
import { updateMeSchema } from '../validators/userSchemas.js';

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Demasiados intentos. Prueba más tarde.' },
  },
});

router.post(
  '/register',
  authLimiter,
  uploadImage.single('avatar'),
  validate(registerSchema),
  asyncHandler(register),
);
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(login));
router.get('/me', requireAuth, asyncHandler(me));
router.patch(
  '/me',
  requireAuth,
  uploadImage.single('avatar'),
  validate(updateMeSchema),
  asyncHandler(updateMe),
);
router.delete('/me', requireAuth, asyncHandler(deleteMe));

export { router as authRoutes };

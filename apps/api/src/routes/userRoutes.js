import { Router } from 'express';

import {
  addFavorite,
  deleteUser,
  getUser,
  listUsers,
  removeFavorite,
  deleteMe,
  updateMe,
  updateRole,
  updateUser,
} from '../controllers/userController.js';
import { allowRoles, requireAuth } from '../middlewares/auth.js';
import { uploadImage } from '../middlewares/upload.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../constants/domain.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  favoriteSchema,
  listUsersSchema,
  updateRoleSchema,
  updateMeSchema,
  updateUserSchema,
  userIdSchema,
} from '../validators/userSchemas.js';

const router = Router();
router.use(requireAuth);

router.get('/', allowRoles(ROLES.ADMIN), validate(listUsersSchema), asyncHandler(listUsers));
router.put('/me/favorites/:itemId', validate(favoriteSchema), asyncHandler(addFavorite));
router.delete('/me/favorites/:itemId', validate(favoriteSchema), asyncHandler(removeFavorite));
router.patch('/me', uploadImage.single('avatar'), validate(updateMeSchema), asyncHandler(updateMe));
router.delete('/me', asyncHandler(deleteMe));
router.get('/:id', validate(userIdSchema), asyncHandler(getUser));
router.patch(
  '/:id',
  uploadImage.single('avatar'),
  validate(updateUserSchema),
  asyncHandler(updateUser),
);
router.patch(
  '/:id/role',
  allowRoles(ROLES.ADMIN),
  validate(updateRoleSchema),
  asyncHandler(updateRole),
);
router.delete('/:id', validate(userIdSchema), asyncHandler(deleteUser));

export { router as userRoutes };

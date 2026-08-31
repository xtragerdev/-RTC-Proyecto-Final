import { Router } from 'express';

import { ROLES } from '../constants/domain.js';
import {
  addManager,
  createHub,
  deleteHub,
  getHub,
  listHubs,
  removeManager,
  updateHub,
} from '../controllers/hubController.js';
import { createItem } from '../controllers/itemController.js';
import { allowRoles, optionalAuth, requireAuth } from '../middlewares/auth.js';
import { uploadImage } from '../middlewares/upload.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createHubSchema,
  hubIdSchema,
  hubLookupSchema,
  listHubsSchema,
  managerSchema,
  updateHubSchema,
} from '../validators/hubSchemas.js';
import { createItemSchema } from '../validators/itemSchemas.js';

const router = Router();

router.get('/', optionalAuth, validate(listHubsSchema), asyncHandler(listHubs));
router.get('/:idOrSlug', optionalAuth, validate(hubLookupSchema), asyncHandler(getHub));
router.post(
  '/:hubId/items',
  requireAuth,
  allowRoles(ROLES.MANAGER, ROLES.ADMIN),
  uploadImage.single('image'),
  validate(createItemSchema),
  asyncHandler(createItem),
);
router.post(
  '/',
  requireAuth,
  allowRoles(ROLES.ADMIN),
  uploadImage.single('image'),
  validate(createHubSchema),
  asyncHandler(createHub),
);
router.patch(
  '/:id',
  requireAuth,
  allowRoles(ROLES.MANAGER, ROLES.ADMIN),
  uploadImage.single('image'),
  validate(updateHubSchema),
  asyncHandler(updateHub),
);
router.delete(
  '/:id',
  requireAuth,
  allowRoles(ROLES.ADMIN),
  validate(hubIdSchema),
  asyncHandler(deleteHub),
);
router.put(
  '/:id/managers/:userId',
  requireAuth,
  allowRoles(ROLES.ADMIN),
  validate(managerSchema),
  asyncHandler(addManager),
);
router.delete(
  '/:id/managers/:userId',
  requireAuth,
  allowRoles(ROLES.ADMIN),
  validate(managerSchema),
  asyncHandler(removeManager),
);

export { router as hubRoutes };

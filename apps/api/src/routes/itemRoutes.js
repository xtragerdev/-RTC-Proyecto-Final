import { Router } from 'express';

import { ROLES } from '../constants/domain.js';
import {
  createItem,
  deleteItem,
  getItem,
  listItems,
  updateItem,
} from '../controllers/itemController.js';
import { allowRoles, requireAuth } from '../middlewares/auth.js';
import { uploadImage } from '../middlewares/upload.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createItemSchema,
  itemIdSchema,
  itemLookupSchema,
  listItemsSchema,
  updateItemSchema,
} from '../validators/itemSchemas.js';

const router = Router();

router.get('/', validate(listItemsSchema), asyncHandler(listItems));
router.get('/:id', validate(itemLookupSchema), asyncHandler(getItem));
router.post(
  '/hub/:hubId',
  requireAuth,
  allowRoles(ROLES.MANAGER, ROLES.ADMIN),
  uploadImage.single('image'),
  validate(createItemSchema),
  asyncHandler(createItem),
);
router.patch(
  '/:id',
  requireAuth,
  allowRoles(ROLES.MANAGER, ROLES.ADMIN),
  uploadImage.single('image'),
  validate(updateItemSchema),
  asyncHandler(updateItem),
);
router.delete(
  '/:id',
  requireAuth,
  allowRoles(ROLES.MANAGER, ROLES.ADMIN),
  validate(itemIdSchema),
  asyncHandler(deleteItem),
);

export { router as itemRoutes };

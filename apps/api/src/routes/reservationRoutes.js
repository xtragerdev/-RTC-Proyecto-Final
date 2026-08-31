import { Router } from 'express';

import { ROLES } from '../constants/domain.js';
import {
  cancelReservation,
  createReservation,
  getReservation,
  listReservations,
  reservationSummary,
  updateReservation,
  updateReservationStatus,
} from '../controllers/reservationController.js';
import { allowRoles, requireAuth } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  createReservationSchema,
  listReservationsSchema,
  reservationIdSchema,
  updateReservationSchema,
  updateReservationStatusSchema,
} from '../validators/reservationSchemas.js';

const router = Router();
router.use(requireAuth);

router.get('/summary', asyncHandler(reservationSummary));
router.get('/', validate(listReservationsSchema), asyncHandler(listReservations));
router.post('/', validate(createReservationSchema), asyncHandler(createReservation));
router.get('/:id', validate(reservationIdSchema), asyncHandler(getReservation));
router.patch('/:id', validate(updateReservationSchema), asyncHandler(updateReservation));
router.patch(
  '/:id/status',
  allowRoles(ROLES.MANAGER, ROLES.ADMIN),
  validate(updateReservationStatusSchema),
  asyncHandler(updateReservationStatus),
);
router.delete('/:id', validate(reservationIdSchema), asyncHandler(cancelReservation));

export { router as reservationRoutes };

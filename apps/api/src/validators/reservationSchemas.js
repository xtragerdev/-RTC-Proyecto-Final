import { z } from 'zod';

import { RESERVATION_STATUSES } from '../constants/domain.js';
import { objectId, paginationQuery, requestSchema } from './common.js';

const dateRange = z
  .object({
    item: z.string().trim().min(1).max(180),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    memberNote: z.string().trim().max(500).optional(),
  })
  .refine((body) => body.endDate > body.startDate, {
    path: ['endDate'],
    message: 'La fecha de fin debe ser posterior a la de inicio',
  });

export const createReservationSchema = requestSchema({ body: dateRange });

export const listReservationsSchema = requestSchema({
  query: paginationQuery.extend({
    status: z.enum(RESERVATION_STATUSES).optional(),
    hub: objectId.optional(),
    user: objectId.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  }),
});

export const reservationIdSchema = requestSchema({ params: z.object({ id: objectId }) });

export const updateReservationSchema = requestSchema({
  params: z.object({ id: objectId }),
  body: z
    .object({
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      memberNote: z.string().trim().max(500).nullable().optional(),
      managerNote: z.string().trim().max(500).nullable().optional(),
    })
    .refine((body) => Object.keys(body).length > 0, 'Debes enviar al menos un cambio'),
});

export const updateReservationStatusSchema = requestSchema({
  params: z.object({ id: objectId }),
  body: z.object({
    status: z.enum(RESERVATION_STATUSES),
    managerNote: z.string().trim().max(500).optional(),
  }),
});

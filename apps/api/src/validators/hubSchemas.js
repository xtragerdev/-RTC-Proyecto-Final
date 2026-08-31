import { z } from 'zod';

import { objectId, optionalBoolean, paginationQuery, requestSchema } from './common.js';

const baseHub = z.object({
  code: z.string().trim().min(3).max(40).optional(),
  name: z.string().trim().min(3).max(120),
  slug: z.string().trim().min(3).max(140).optional(),
  district: z.string().trim().min(2).max(80),
  neighborhood: z.string().trim().max(100).optional(),
  address: z.string().trim().min(5).max(200),
  postalCode: z.string().trim().max(12).optional(),
  description: z.string().trim().min(20).max(800),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  openingHours: z.string().trim().min(3).max(200),
  contactEmail: z.string().trim().toLowerCase().email().max(160),
  managers: z.array(objectId).max(20).optional(),
  active: z.boolean().optional(),
});

export const listHubsSchema = requestSchema({
  query: paginationQuery.extend({
    q: z.string().trim().max(100).optional(),
    district: z.string().trim().max(80).optional(),
    includeInactive: optionalBoolean,
  }),
});

export const hubLookupSchema = requestSchema({
  params: z.object({ idOrSlug: z.string().trim().min(1).max(160) }),
});

export const hubIdSchema = requestSchema({
  params: z.object({ id: objectId }),
});

export const createHubSchema = requestSchema({ body: baseHub });

export const updateHubSchema = requestSchema({
  params: z.object({ id: objectId }),
  body: baseHub.partial(),
});

export const managerSchema = requestSchema({
  params: z.object({ id: objectId, userId: objectId }),
});

import { z } from 'zod';

import { ROLE_VALUES } from '../constants/domain.js';
import { idParams, objectId, optionalBoolean, paginationQuery, requestSchema } from './common.js';

export const listUsersSchema = requestSchema({
  query: paginationQuery.extend({
    q: z.string().trim().max(100).optional(),
    role: z.enum(ROLE_VALUES).optional(),
    active: optionalBoolean,
  }),
});

export const userIdSchema = requestSchema({ params: idParams });

const updateUserBody = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  district: z.string().trim().max(80).nullable().optional(),
  preferredHub: objectId.nullable().optional(),
});

export const updateUserSchema = requestSchema({ params: idParams, body: updateUserBody });
export const updateMeSchema = requestSchema({ body: updateUserBody });

export const updateRoleSchema = requestSchema({
  params: idParams,
  body: z.object({ role: z.enum(ROLE_VALUES) }),
});

export const favoriteSchema = requestSchema({
  params: z.object({ itemId: objectId }),
});

import { z } from 'zod';

import { ITEM_CATEGORIES, ITEM_CONDITIONS, ITEM_STATUSES } from '../constants/domain.js';
import { objectId, paginationQuery, requestSchema, tagsField } from './common.js';

const baseItem = z.object({
  code: z.string().trim().min(3).max(40).optional(),
  name: z.string().trim().min(3).max(140),
  slug: z.string().trim().min(3).max(180).optional(),
  description: z.string().trim().min(20).max(1500),
  category: z.enum(ITEM_CATEGORIES),
  condition: z.enum(ITEM_CONDITIONS).optional(),
  status: z.enum(ITEM_STATUSES).optional(),
  depositEuros: z.coerce.number().min(0).max(10000).optional(),
  maxLoanDays: z.coerce.number().int().min(1).max(30).optional(),
  replacementCostEuros: z.coerce.number().min(0).max(100000),
  estimatedWasteKg: z.coerce.number().min(0).max(10000).optional(),
  tags: tagsField.optional(),
  instructions: z.string().trim().max(1200).optional(),
  acquiredAt: z.coerce.date().optional(),
});

export const listItemsSchema = requestSchema({
  query: paginationQuery.extend({
    q: z.string().trim().max(100).optional(),
    search: z.string().trim().max(100).optional(),
    hub: z.string().trim().min(1).max(180).optional(),
    centro: z.string().trim().min(1).max(180).optional(),
    available: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    category: z.enum(ITEM_CATEGORIES).optional(),
    status: z.enum(ITEM_STATUSES).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    sort: z.enum(['newest', 'name', 'loans']).optional(),
  }),
});

export const itemLookupSchema = requestSchema({
  params: z.object({ id: z.string().trim().min(1).max(180) }),
});
export const itemIdSchema = requestSchema({ params: z.object({ id: objectId }) });

export const createItemSchema = requestSchema({
  params: z.object({ hubId: objectId }),
  body: baseItem,
});

export const updateItemSchema = requestSchema({
  params: z.object({ id: objectId }),
  body: baseItem.partial(),
});

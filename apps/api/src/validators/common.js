import { z } from 'zod';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Identificador no válido');

export const idParams = z.object({ id: objectId });

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const optionalBoolean = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true')
  .optional();

export const requestSchema = ({ body, params, query } = {}) =>
  z.object({
    body: body ?? z.object({}).passthrough().optional().default({}),
    params: params ?? z.object({}).passthrough(),
    query: query ?? z.object({}).passthrough(),
  });

export const tagsField = z.preprocess(
  (value) => {
    if (typeof value === 'string') {
      return value
        .split(/[|,]/)
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean);
    }
    return value;
  },
  z.array(z.string().trim().min(1).max(40)).max(15),
);

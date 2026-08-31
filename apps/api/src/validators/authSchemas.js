import { z } from 'zod';

import { objectId, requestSchema } from './common.js';

const email = z.string().trim().toLowerCase().email('Email no válido').max(160);

export const registerSchema = requestSchema({
  body: z.object({
    name: z.string().trim().min(2).max(80),
    email,
    password: z.string().min(8).max(128),
    district: z.string().trim().max(80).optional(),
    preferredHub: objectId.nullable().optional(),
  }),
});

export const loginSchema = requestSchema({
  body: z.object({ email, password: z.string().min(1).max(128) }),
});

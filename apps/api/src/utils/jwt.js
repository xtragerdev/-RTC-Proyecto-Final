import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';

const JWT_ALGORITHM = 'HS256';

export const signAccessToken = (userId) =>
  jwt.sign({ sub: userId }, env.jwtSecret, {
    algorithm: JWT_ALGORITHM,
    expiresIn: env.jwtExpiresIn,
  });

export const verifyAccessToken = (token) =>
  jwt.verify(token, env.jwtSecret, { algorithms: [JWT_ALGORITHM] });

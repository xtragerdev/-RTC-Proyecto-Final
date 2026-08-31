import compression from 'compression';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env.js';
import { openApiDocument } from './docs/openapi.js';
import { health, ready } from './controllers/healthController.js';
import { errorHandler, notFound } from './middlewares/errors.js';
import { authRoutes } from './routes/authRoutes.js';
import { hubRoutes } from './routes/hubRoutes.js';
import { itemRoutes } from './routes/itemRoutes.js';
import { reservationRoutes } from './routes/reservationRoutes.js';
import { userRoutes } from './routes/userRoutes.js';
import { AppError } from './utils/AppError.js';

export const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(
  pinoHttp({
    enabled: env.nodeEnv !== 'test',
    redact: ['req.headers.authorization', 'req.body.password'],
  }),
);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.clientOrigins.includes('*') || env.clientOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new AppError('Origen no permitido por CORS', 403, 'CORS_FORBIDDEN'));
    },
    credentials: false,
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.nodeEnv === 'test' ? 10_000 : 500,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Demasiadas peticiones. Prueba más tarde.' },
    },
  }),
);

app.get('/api/v1/health', health);
app.get('/api/v1/ready', ready);
app.get('/api/v1/openapi.json', (_req, res) => res.json(openApiDocument));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument, { explorer: true }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/hubs', hubRoutes);
app.use('/api/v1/items', itemRoutes);
app.use('/api/v1/reservations', reservationRoutes);

app.use(notFound);
app.use(errorHandler);

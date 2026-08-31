import mongoose from 'mongoose';

import { sendSuccess } from '../utils/apiResponse.js';

export const health = (_req, res) =>
  sendSuccess(res, {
    data: {
      status: 'ok',
      service: 'renodo-api',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });

export const ready = (_req, res) => {
  const isReady = mongoose.connection.readyState === 1;
  return res.status(isReady ? 200 : 503).json({
    success: isReady,
    data: {
      status: isReady ? 'ready' : 'not-ready',
      database: isReady ? 'connected' : 'disconnected',
    },
  });
};

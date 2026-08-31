import 'dotenv/config';

const numberFromEnv = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = Object.freeze({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: numberFromEnv(process.env.PORT, 4000),
  mongoUri: process.env.MONGO_URI ?? process.env.MONGODB_URI ?? '',
  mongoAutoIndex: process.env.MONGO_AUTO_INDEX !== 'false',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  clientOrigins: (
    process.env.CLIENT_ORIGINS ??
    process.env.CLIENT_ORIGIN ??
    'http://localhost:5173,http://localhost:3000'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
    folder: process.env.CLOUDINARY_FOLDER ?? 'renodo',
  },
});

export const assertRuntimeEnv = () => {
  const missing = [];
  if (!env.mongoUri) missing.push('MONGO_URI o MONGODB_URI');
  if (!env.jwtSecret) missing.push('JWT_SECRET');

  if (missing.length) {
    throw new Error(`Faltan variables obligatorias: ${missing.join(', ')}`);
  }

  if (env.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres');
  }
};

import mongoose from 'mongoose';

import { env } from './env.js';

export const connectDatabase = async (uri = env.mongoUri) => {
  await mongoose.connect(uri, { autoIndex: env.mongoAutoIndex });
  console.info(`MongoDB conectado: ${mongoose.connection.name}`);
};

export const disconnectDatabase = () => mongoose.disconnect();

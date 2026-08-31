import { createServer } from 'node:http';

import { app } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { assertRuntimeEnv, env } from './config/env.js';

assertRuntimeEnv();
await connectDatabase();

const server = createServer(app);
server.listen(env.port, '0.0.0.0', () => {
  console.info(`ReNodo API disponible en http://localhost:${env.port}`);
});

let closing = false;
const shutdown = async (signal) => {
  if (closing) return;
  closing = true;
  console.info(`${signal}: cerrando ReNodo API`);
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

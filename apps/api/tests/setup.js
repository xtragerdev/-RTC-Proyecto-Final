import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { afterAll, afterEach, beforeAll } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-with-at-least-thirty-two-characters';
process.env.JWT_EXPIRES_IN = '1h';
process.env.CLIENT_ORIGINS = 'http://localhost:5173';
process.env.SEED_USER_PASSWORD = 'ReNodoDemo2026!';

let replicaSet;

beforeAll(async () => {
  replicaSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  await mongoose.connect(replicaSet.getUri(), { dbName: 'renodo-test' });
});

afterEach(async () => {
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})),
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  if (replicaSet) await replicaSet.stop();
});

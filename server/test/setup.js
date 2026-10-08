// Before every server test file: connect to a fresh database and build the indexes. Between tests: wipe the data.
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, inject } from 'vitest';

beforeAll(async () => {
  await mongoose.connect(inject('mongoUri'), { dbName: `test-${process.pid}-${Math.random().toString(36).slice(2, 8)}` });
  // The unique indexes must exist before the first insert, or a duplicate would slip through.
  await Promise.all(Object.values(mongoose.models).map((model) => model.createIndexes()));
});

afterEach(async () => {
  await Promise.all(Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

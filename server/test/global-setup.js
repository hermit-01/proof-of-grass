// Starts one in-memory MongoDB for the whole server test run; each test file gets its own database in it.
// The first run downloads MongoDB (a few hundred MB) into .cache/mongodb, which is git-ignored.
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server-core';

export default async function setup(project) {
  process.env.MONGOMS_DOWNLOAD_DIR ??= fileURLToPath(new URL('../../.cache/mongodb', import.meta.url));
  const mongod = await MongoMemoryServer.create();
  project.provide('mongoUri', mongod.getUri());
  return async () => {
    await mongod.stop();
  };
}

// Starts the server: connect to MongoDB, then serve the API and the built client from one origin.
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { createApp } from './app.js';

const { MONGODB_URI, JWT_SECRET, NODE_ENV, PORT = '3000' } = process.env;
const production = NODE_ENV === 'production';

if (!MONGODB_URI || !JWT_SECRET) {
  console.error('Set MONGODB_URI and JWT_SECRET first (see server/.env.example).');
  process.exit(1);
}
if (JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters.');
  process.exit(1);
}

let uri = MONGODB_URI;
if (uri === 'memory') {
  if (production) {
    console.error('MONGODB_URI=memory is for local development only.');
    process.exit(1);
  }
  // Local development without Atlas: a throwaway in-memory MongoDB. Its data is gone on restart.
  const { MongoMemoryServer } = await import('mongodb-memory-server-core');
  process.env.MONGOMS_DOWNLOAD_DIR ??= fileURLToPath(new URL('../../.cache/mongodb', import.meta.url));
  uri = (await MongoMemoryServer.create()).getUri();
  console.log('Using an in-memory MongoDB (MONGODB_URI=memory). Data is lost on restart.');
}
await mongoose.connect(uri);

const app = createApp({
  jwtSecret: JWT_SECRET,
  secureCookies: production,
  clientDist: fileURLToPath(new URL('../../client/dist', import.meta.url)),
});
app.listen(Number(PORT), () => console.log(`Proof of Grass is listening on http://localhost:${PORT}`));

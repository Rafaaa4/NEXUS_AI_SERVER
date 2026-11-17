import { app } from './app';
import { config } from './config/env';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';

async function bootstrap() {
  try {
    // Attempt DB connection check
    await prisma.$connect();
    console.log('✅ [Database] PostgreSQL connected successfully');
  } catch (err: any) {
    console.warn('⚠️ [Database] Could not connect to PostgreSQL immediately:', err.message);
  }

  try {
    await redis.ping();
    console.log('✅ [Redis] Connected successfully');
  } catch (err: any) {
    console.warn('⚠️ [Redis] Could not connect to Redis immediately:', err.message);
  }

  app.listen(config.port, () => {
    console.log(`🚀 [NEXUS API] Server listening on http://localhost:${config.port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

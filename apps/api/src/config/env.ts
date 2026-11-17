import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_nexus_ai_dev_at_least_32_bytes_long',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  refreshTokenExpiresDays: parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS || '7', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://nexus:nexus_dev_password@localhost:5432/nexus_ai?schema=public',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
};

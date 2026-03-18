import dotenv from 'dotenv';

dotenv.config();

const required = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'FRONTEND_ORIGIN'
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN,
  frontendOrigins: (process.env.FRONTEND_ORIGIN ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  databaseUrl: process.env.DATABASE_URL,
  dbSsl: (process.env.DB_SSL ?? 'true') === 'true',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
  refreshCookieName: process.env.REFRESH_COOKIE_NAME ?? 'refresh_token',
  refreshCookieSecure: (process.env.REFRESH_COOKIE_SECURE ?? 'false') === 'true',
  autoRunMigrations: (process.env.AUTO_RUN_MIGRATIONS ?? 'true') === 'true'
};

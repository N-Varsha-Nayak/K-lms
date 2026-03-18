import { app } from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';
import { runMigrations } from './utils/runMigrations.js';

async function bootstrap() {
  if (env.autoRunMigrations) {
    await runMigrations();
  }

  app.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://localhost:${env.port}`);
  });
}

bootstrap().catch(async (error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', error);
  await pool.end();
  process.exit(1);
});

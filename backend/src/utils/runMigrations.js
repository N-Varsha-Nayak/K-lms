import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../../migrations');

export async function runMigrations() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const files = (await fs.readdir(migrationsDir))
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const [existing] = await pool.execute('SELECT id FROM migrations WHERE name = ?', [file]);
    if (existing.length > 0) continue;

    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    await pool.query(sql);
    await pool.execute('INSERT INTO migrations (name) VALUES (?)', [file]);
  }
}

if (process.argv[1] === __filename) {
  runMigrations()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('Migrations complete');
      return pool.end();
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error(error);
      process.exit(1);
    });
}

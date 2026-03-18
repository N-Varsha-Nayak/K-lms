import mysql from 'mysql2/promise';
import { env } from './env.js';

function sanitizeDatabaseUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.delete('ssl-mode');
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

const baseOptions = {
  uri: sanitizeDatabaseUrl(env.databaseUrl),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true,
  multipleStatements: true
};

export const pool = env.dbSsl
  ? mysql.createPool({
      ...baseOptions,
      ssl: {
        rejectUnauthorized: false
      }
    })
  : mysql.createPool(baseOptions);

export async function dbQuery(sql, params = {}) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function dbTransaction(handler) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await handler(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

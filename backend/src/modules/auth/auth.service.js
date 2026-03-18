import bcrypt from 'bcryptjs';
import { dbQuery } from '../../config/db.js';
import { createHttpError } from '../../utils/errors.js';
import { sha256 } from '../../utils/crypto.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt.js';

const SALT_ROUNDS = 12;
let usersTableColumnsCache = null;

function randomSuffix(length = 6) {
  return Math.random().toString(36).slice(2, 2 + length);
}

function buildLegacyUserId() {
  return `u_${Date.now().toString(36)}_${randomSuffix(5)}`.slice(0, 30);
}

function buildLegacyUsername(email) {
  const base = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20) || 'user';
  return `${base}_${randomSuffix(6)}`.slice(0, 30);
}

function buildLegacyPhone() {
  // Generates a deterministic-length placeholder to satisfy legacy NOT NULL schema.
  return `9${Math.floor(Math.random() * 1e9)
    .toString()
    .padStart(9, '0')}`;
}

async function getUsersTableColumns() {
  if (usersTableColumnsCache) return usersTableColumnsCache;

  const rows = await dbQuery('SHOW COLUMNS FROM users');
  usersTableColumnsCache = new Set(rows.map((row) => row.Field));
  return usersTableColumnsCache;
}

export async function registerUser({ email, password, name }) {
  const existing = await dbQuery('SELECT id FROM users WHERE email = :email LIMIT 1', { email });
  if (existing.length > 0) throw createHttpError(409, 'Email already registered');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const usersColumns = await getUsersTableColumns();

  const insertData = {
    email,
    passwordHash,
    name,
    userId: buildLegacyUserId(),
    username: buildLegacyUsername(email),
    phone: buildLegacyPhone()
  };

  const insertColumns = [];
  const insertPlaceholders = [];

  if (usersColumns.has('email')) {
    insertColumns.push('email');
    insertPlaceholders.push(':email');
  }
  if (usersColumns.has('password_hash')) {
    insertColumns.push('password_hash');
    insertPlaceholders.push(':passwordHash');
  }
  if (usersColumns.has('name')) {
    insertColumns.push('name');
    insertPlaceholders.push(':name');
  }
  if (usersColumns.has('user_id')) {
    insertColumns.push('user_id');
    insertPlaceholders.push(':userId');
  }
  if (usersColumns.has('username')) {
    insertColumns.push('username');
    insertPlaceholders.push(':username');
  }
  if (usersColumns.has('phone')) {
    insertColumns.push('phone');
    insertPlaceholders.push(':phone');
  }

  const result = await dbQuery(
    `INSERT INTO users (${insertColumns.join(', ')}) VALUES (${insertPlaceholders.join(', ')})`,
    insertData
  );

  return { id: Number(result.insertId), email, name };
}

export async function loginUser({ email, password }) {
  const rows = await dbQuery(
    'SELECT id, email, name, password_hash FROM users WHERE email = :email LIMIT 1',
    { email }
  );

  if (rows.length === 0) throw createHttpError(401, 'Invalid email or password');

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw createHttpError(401, 'Invalid email or password');

  return { id: Number(user.id), email: user.email, name: user.name };
}

export async function issueSession(userId) {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);
  const tokenHash = sha256(refreshToken);

  await dbQuery(
    `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES (:userId, :tokenHash, DATE_ADD(NOW(), INTERVAL 30 DAY))
    `,
    { userId, tokenHash }
  );

  return { accessToken, refreshToken };
}

export async function rotateRefreshToken(rawToken) {
  let payload;
  try {
    payload = verifyRefreshToken(rawToken);
  } catch {
    throw createHttpError(401, 'Invalid refresh token');
  }

  const userId = Number(payload.sub);
  const tokenHash = sha256(rawToken);

  const existing = await dbQuery(
    `
      SELECT id
      FROM refresh_tokens
      WHERE user_id = :userId
        AND token_hash = :tokenHash
        AND revoked_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
    `,
    { userId, tokenHash }
  );

  if (existing.length === 0) throw createHttpError(401, 'Refresh token revoked or expired');

  await dbQuery('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = :id', {
    id: existing[0].id
  });

  return issueSession(userId);
}

export async function revokeRefreshToken(rawToken) {
  const tokenHash = sha256(rawToken);
  await dbQuery(
    'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = :tokenHash AND revoked_at IS NULL',
    { tokenHash }
  );
}

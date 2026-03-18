import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAccessToken(userId) {
  return jwt.sign({}, env.jwtAccessSecret, {
    subject: String(userId),
    expiresIn: env.jwtAccessExpiresIn
  });
}

export function signRefreshToken(userId) {
  return jwt.sign({}, env.jwtRefreshSecret, {
    subject: String(userId),
    expiresIn: env.jwtRefreshExpiresIn
  });
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}

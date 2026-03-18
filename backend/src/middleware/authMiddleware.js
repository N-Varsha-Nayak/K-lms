import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function requireAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('Unauthorized');
    error.statusCode = 401;
    return next(error);
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, env.jwtAccessSecret);
    req.user = { id: payload.sub };
    return next();
  } catch {
    const error = new Error('Invalid or expired token');
    error.statusCode = 401;
    return next(error);
  }
}

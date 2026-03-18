import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import {
  issueSession,
  loginUser,
  registerUser,
  revokeRefreshToken,
  rotateRefreshToken
} from './auth.service.js';
import { createHttpError } from '../../utils/errors.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8).max(100),
  name: z.string().min(2).max(120)
});

const loginSchema = z.object({
  email: z.string().email().transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8).max(100)
});

function setRefreshCookie(res, token) {
  res.cookie(env.refreshCookieName, token, {
    httpOnly: true,
    secure: env.refreshCookieSecure,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/api/auth'
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(env.refreshCookieName, {
    httpOnly: true,
    secure: env.refreshCookieSecure,
    sameSite: 'lax',
    path: '/api/auth'
  });
}

router.post('/register', async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body);
    const user = await registerUser(payload);
    const session = await issueSession(user.id);

    setRefreshCookie(res, session.refreshToken);

    return res.status(201).json({
      user,
      access_token: session.accessToken,
      expires_in: env.jwtAccessExpiresIn
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body);
    const user = await loginUser(payload);
    const session = await issueSession(user.id);

    setRefreshCookie(res, session.refreshToken);

    return res.json({
      user,
      access_token: session.accessToken,
      expires_in: env.jwtAccessExpiresIn
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const current = req.cookies?.[env.refreshCookieName];
    if (!current) throw createHttpError(401, 'Missing refresh token');

    const session = await rotateRefreshToken(current);
    setRefreshCookie(res, session.refreshToken);

    return res.json({
      access_token: session.accessToken,
      expires_in: env.jwtAccessExpiresIn
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const current = req.cookies?.[env.refreshCookieName];
    if (current) {
      await revokeRefreshToken(current);
    }
    clearRefreshCookie(res);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export const authRouter = router;

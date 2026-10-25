/**
 * routes/auth.routes.ts
 *
 * Authentication endpoints — register, login, and get current user.
 * Routes are thin: they parse input, call the service, and respond.
 * All business logic lives in auth.service.ts.
 *
 * The default db singleton (node:sqlite) is injected here.
 * Integration tests wire their own in-memory DB directly into the router.
 */

import { Router } from 'express';
import type { Response } from 'express';
import { register, login } from '../services/auth.service.js';
import { requireAuth } from '../middleware/auth.js';
import type { AuthRequest } from '../types/index.js';
import db from '../db/database.js';

export const authRouter = Router();

/** POST /api/auth/register — create a new user account */
authRouter.post('/register', (req, res: Response) => {
  try {
    const result = register(db, req.body);
    res.status(201).json(result);
  } catch (err) {
    const e = err as any;
    res.status(e.statusCode ?? 500).json({ error: e.message ?? 'Registration failed.' });
  }
});

/** POST /api/auth/login — authenticate and receive a JWT */
authRouter.post('/login', (req, res: Response) => {
  try {
    const result = login(db, req.body);
    res.json(result);
  } catch (err) {
    const e = err as any;
    res.status(e.statusCode ?? 500).json({ error: e.message ?? 'Login failed.' });
  }
});

/** GET /api/auth/me — return the currently authenticated user */
authRouter.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});

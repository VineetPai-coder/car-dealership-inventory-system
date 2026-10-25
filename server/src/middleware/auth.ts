/**
 * middleware/auth.ts
 *
 * JWT authentication middleware.
 * Attaches the decoded user payload to req.user for downstream handlers.
 */

import type { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthRequest, User } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'development-only-secret-change-in-production';

/**
 * Requires a valid Bearer token in the Authorization header.
 * Returns 401 if the token is missing or invalid / expired.
 */
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace(/^Bearer\s+/i, '');

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET) as User;
    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
}

/**
 * Requires the authenticated user to have role = 'admin'.
 * Must be used AFTER requireAuth.
 * Returns 403 if the user is not an admin.
 */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required.' });
    return;
  }
  next();
}

/**
 * Signs a JWT for the given user payload.
 * Extracted here so it can be used in tests and services without duplicating the secret.
 */
export function signToken(payload: User): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

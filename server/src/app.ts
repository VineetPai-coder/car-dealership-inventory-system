/**
 * app.ts — Express application factory
 *
 * This file creates and configures the Express app but does NOT call app.listen().
 * Separating the app from the server entry point is the key pattern that makes
 * integration testing possible: tests import this file and pass it to supertest
 * without binding any port.
 *
 * server.ts is the only file that calls app.listen() and is excluded from tests.
 */

import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { authRouter } from './routes/auth.routes.js';
import { vehiclesRouter } from './routes/vehicles.routes.js';
import type { AppError } from './types/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Create app ───────────────────────────────────────────────────────────────

const app = express();

// ─── Core middleware ──────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'car-dealership-api' });
});

// ─── API routes ───────────────────────────────────────────────────────────────

app.use('/api/auth', authRouter);
app.use('/api/vehicles', vehiclesRouter);

// ─── Serve frontend in production ─────────────────────────────────────────────

const clientDist = path.resolve(__dirname, '../../../client/dist');
app.use(express.static(clientDist));

// Fallback — serve React SPA for non-API routes (client-side routing)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

// ─── Global error handler ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const appErr = err as AppError;
  const statusCode = typeof appErr.statusCode === 'number' ? appErr.statusCode : 500;
  res.status(statusCode).json({ error: appErr.message || 'An unexpected error occurred.' });
});

export default app;

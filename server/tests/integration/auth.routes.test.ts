/**
 * tests/integration/auth.routes.test.ts
 *
 * Integration tests for POST /api/auth/register, /login, GET /api/auth/me
 * Phase 1 — RED: Tests will fail until auth.service is implemented.
 *
 * Run:  npm test -- auth.routes
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { authRouter } from '../../src/routes/auth.routes.js';
import { createTestDb } from '../helpers/db.js';
import { adminToken, userToken } from '../helpers/auth.js';
import { requireAuth } from '../../src/middleware/auth.js';
import type { AuthRequest } from '../../src/types/index.js';

/**
 * Builds a fresh Express app wired to an in-memory database for each test.
 * This avoids port conflicts and gives every test a clean state.
 */
async function buildTestApp() {
  const db = createTestDb();
  const app = express();
  app.use(express.json());

  // Inject the test DB into the route by monkey-patching the module import.
  // For integration tests we wire routes directly with the test DB.
  // We rebuild the router inline so we can inject the test db.
  const router = express.Router();

  const { register, login } = await import('../../src/services/auth.service.js');
  const { requireAuth, signToken } = await import('../../src/middleware/auth.js');

  router.post('/register', (req, res) => {
    try { res.status(201).json(register(db, req.body)); }
    catch (e: any) { res.status(e.statusCode ?? 500).json({ error: e.message }); }
  });
  router.post('/login', (req, res) => {
    try { res.json(login(db, req.body)); }
    catch (e: any) { res.status(e.statusCode ?? 500).json({ error: e.message }); }
  });
  router.get('/me', requireAuth, (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });

  app.use('/api/auth', router);
  return { app, db };
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  let app: express.Express;
  let db: ReturnType<typeof createTestDb>;

  beforeEach(async () => {
    ({ app, db } = await buildTestApp());
  });

  it('I1 — 201 with token and user on valid body', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Alice', email: 'alice@test.com', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('alice@test.com');
    expect(res.body.user.role).toBe('user');
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('I2 — 409 when email already registered', async () => {
    await request(app).post('/api/auth/register')
      .send({ name: 'Alice', email: 'dup@test.com', password: 'password123' });
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Alice2', email: 'dup@test.com', password: 'password456' });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });

  it('I3 — 400 when password is fewer than 8 characters', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Bob', email: 'bob@test.com', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('I4 — 400 when email format is invalid', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ name: 'Carol', email: 'not-an-email', password: 'password123' });
    expect(res.status).toBe(400);
  });

  it('I5 — 400 when name is missing', async () => {
    const res = await request(app).post('/api/auth/register')
      .send({ email: 'noname@test.com', password: 'password123' });
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  let app: express.Express;

  beforeEach(async () => {
    ({ app } = await buildTestApp());
    // Pre-register a user
    await request(app).post('/api/auth/register')
      .send({ name: 'Dave', email: 'dave@test.com', password: 'password123' });
  });

  it('I6 — 200 with token and user for correct credentials', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'dave@test.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('dave@test.com');
  });

  it('I7 — 401 for wrong password', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'dave@test.com', password: 'wrongpass99' });
    expect(res.status).toBe(401);
  });

  it('I8 — 401 for non-existent email', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'ghost@test.com', password: 'password123' });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  let app: express.Express;

  beforeEach(async () => {
    ({ app } = await buildTestApp());
  });

  it('I9 — 200 with user object when token is valid', async () => {
    const token = userToken();
    const res = await request(app).get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toBe('user@test.com');
  });

  it('I10 — 401 when no token is provided', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('I11 — 401 when token is malformed', async () => {
    const res = await request(app).get('/api/auth/me')
      .set('Authorization', 'Bearer this.is.not.a.valid.jwt');
    expect(res.status).toBe(401);
  });
});

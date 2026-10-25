/**
 * tests/integration/vehicles.routes.test.ts
 *
 * Integration tests for /api/vehicles endpoints (CRUD + search + purchase + restock)
 * Phase 2 & 3 — RED: Tests will fail until vehicle service is implemented.
 *
 * Run:  npm test -- vehicles.routes
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { createTestDb, seedVehicle, seedUser } from '../helpers/db.js';
import { adminToken, userToken } from '../helpers/auth.js';
import { requireAuth, requireAdmin } from '../../src/middleware/auth.js';
import { vehicleSchema, restockSchema, searchSchema } from '../../src/validators/vehicle.schema.js';
import type { AuthRequest } from '../../src/types/index.js';
import { DatabaseSync } from 'node:sqlite';

/**
 * Builds a fresh test app with an isolated in-memory DB.
 * Imports services lazily so the test DB can be injected.
 */
async function buildTestApp() {
  const db = createTestDb();
  const app = express();
  app.use(express.json());

  const {
    listVehicles, getVehicleById, createVehicle, updateVehicle,
    deleteVehicle, searchVehicles, purchaseVehicle, restockVehicle,
  } = await import('../../src/services/vehicle.service.js');

  const router = express.Router();
  router.use(requireAuth);

  router.get('/', (_req, res) => {
    try { res.json(listVehicles(db)); }
    catch (e: any) { res.status(e.statusCode ?? 500).json({ error: e.message }); }
  });

  router.get('/search', (req, res) => {
    try {
      const p = searchSchema.safeParse(req.query);
      if (!p.success) { res.status(400).json({ error: p.error.issues[0].message }); return; }
      res.json(searchVehicles(db, p.data));
    } catch (e: any) { res.status(e.statusCode ?? 500).json({ error: e.message }); }
  });

  router.get('/:id', (req, res) => {
    try {
      const vehicle = getVehicleById(db, Number(req.params.id));
      res.json(vehicle);
    } catch (e: any) { res.status(e.statusCode ?? 500).json({ error: e.message }); }
  });

  router.post('/', requireAdmin, (req: AuthRequest, res) => {
    try {
      const p = vehicleSchema.safeParse(req.body);
      if (!p.success) { res.status(400).json({ error: p.error.issues[0].message }); return; }
      res.status(201).json(createVehicle(db, {
        ...p.data,
        dealerId: p.data.dealerId ?? req.user?.id,
      }));
    } catch (e: any) { res.status(e.statusCode ?? 500).json({ error: e.message }); }
  });

  router.put('/:id', requireAdmin, (req, res) => {
    try {
      const p = vehicleSchema.safeParse(req.body);
      if (!p.success) { res.status(400).json({ error: p.error.issues[0].message }); return; }
      res.json(updateVehicle(db, Number(req.params.id), p.data));
    } catch (e: any) { res.status(e.statusCode ?? 500).json({ error: e.message }); }
  });

  router.delete('/:id', requireAdmin, (req, res) => {
    try { deleteVehicle(db, Number(req.params.id)); res.status(204).end(); }
    catch (e: any) { res.status(e.statusCode ?? 500).json({ error: e.message }); }
  });

  router.post('/:id/purchase', (req: AuthRequest, res) => {
    try { res.status(201).json(purchaseVehicle(db, Number(req.params.id), req.user!.id)); }
    catch (e: any) { res.status(e.statusCode ?? 500).json({ error: e.message }); }
  });

  router.post('/:id/restock', requireAdmin, (req, res) => {
    try {
      const p = restockSchema.safeParse(req.body);
      if (!p.success) { res.status(400).json({ error: p.error.issues[0].message }); return; }
      res.json(restockVehicle(db, Number(req.params.id), p.data.quantity));
    } catch (e: any) { res.status(e.statusCode ?? 500).json({ error: e.message }); }
  });

  app.use('/api/vehicles', router);
  return { app, db };
}

const validVehicleBody = {
  make: 'Toyota', model: 'Camry', year: 2023,
  category: 'Sedan', color: 'White', price: 25000, quantity: 5,
  description: 'Reliable sedan.',
};

// ─── GET /api/vehicles ────────────────────────────────────────────────────────

describe('GET /api/vehicles', () => {
  it('I12 — 200 with array when authenticated', async () => {
    const { app, db } = await buildTestApp();
    seedVehicle(db);
    const res = await request(app).get('/api/vehicles')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('I13 — 401 when no token provided', async () => {
    const { app } = await buildTestApp();
    const res = await request(app).get('/api/vehicles');
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/vehicles/:id ────────────────────────────────────────────────────

describe('GET /api/vehicles/:id', () => {
  it('I14 — 200 with vehicle details when vehicle exists', async () => {
    const { app, db } = await buildTestApp();
    const { id } = seedVehicle(db, { make: 'Audi', model: 'A4', price: 39000 });
    const res = await request(app).get(`/api/vehicles/${id}`)
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.make).toBe('Audi');
    expect(res.body.model).toBe('A4');
  });

  it('I15 — 404 for non-existent vehicle ID', async () => {
    const { app } = await buildTestApp();
    const res = await request(app).get('/api/vehicles/9999')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(404);
  });

  it('I16 — 401 when unauthenticated', async () => {
    const { app } = await buildTestApp();
    const res = await request(app).get('/api/vehicles/1');
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/vehicles ───────────────────────────────────────────────────────

describe('POST /api/vehicles', () => {
  it('I17 — 201 with vehicle object and linked dealerId when admin posts valid body', async () => {
    const { app, db } = await buildTestApp();
    const { id: dealerId } = seedUser(db, { email: 'admin@dealership.com', role: 'admin' });
    const res = await request(app).post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken({ id: dealerId })}`)
      .send(validVehicleBody);
    expect(res.status).toBe(201);
    expect(res.body.make).toBe('Toyota');
    expect(typeof res.body.id).toBe('number');
    expect(res.body.dealerId).toBe(dealerId);
  });

  it('I18 — 403 when regular user tries to add a vehicle', async () => {
    const { app } = await buildTestApp();
    const res = await request(app).post('/api/vehicles')
      .set('Authorization', `Bearer ${userToken()}`)
      .send(validVehicleBody);
    expect(res.status).toBe(403);
  });

  it('I19 — 401 when unauthenticated user tries to add a vehicle', async () => {
    const { app } = await buildTestApp();
    const res = await request(app).post('/api/vehicles')
      .send(validVehicleBody);
    expect(res.status).toBe(401);
  });

  it('I20 — 400 when make is missing or empty', async () => {
    const { app } = await buildTestApp();
    const { make, ...noMake } = validVehicleBody;
    const res = await request(app).post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(noMake);
    expect(res.status).toBe(400);
  });

  it('I21 — 400 when model is missing or empty', async () => {
    const { app } = await buildTestApp();
    const { model, ...noModel } = validVehicleBody;
    const res = await request(app).post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(noModel);
    expect(res.status).toBe(400);
  });

  it('I22 — 400 when year is missing or invalid', async () => {
    const { app } = await buildTestApp();
    const res = await request(app).post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ ...validVehicleBody, year: 1850 });
    expect(res.status).toBe(400);
  });

  it('I23 — 400 when category is missing or empty', async () => {
    const { app } = await buildTestApp();
    const { category, ...noCategory } = validVehicleBody;
    const res = await request(app).post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(noCategory);
    expect(res.status).toBe(400);
  });

  it('I24 — 400 when price is negative', async () => {
    const { app } = await buildTestApp();
    const res = await request(app).post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ ...validVehicleBody, price: -100 });
    expect(res.status).toBe(400);
  });

  it('I25 — 400 when quantity is negative', async () => {
    const { app } = await buildTestApp();
    const res = await request(app).post('/api/vehicles')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ ...validVehicleBody, quantity: -5 });
    expect(res.status).toBe(400);
  });
});

// ─── PUT /api/vehicles/:id ────────────────────────────────────────────────────

describe('PUT /api/vehicles/:id', () => {
  it('I26 — 200 with updated vehicle for admin', async () => {
    const { app, db } = await buildTestApp();
    const { id } = seedVehicle(db);
    const res = await request(app).put(`/api/vehicles/${id}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ ...validVehicleBody, make: 'Honda', price: 28000 });
    expect(res.status).toBe(200);
    expect(res.body.make).toBe('Honda');
    expect(res.body.price).toBe(28000);
  });

  it('I27 — 404 for non-existent vehicle ID', async () => {
    const { app } = await buildTestApp();
    const res = await request(app).put('/api/vehicles/9999')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(validVehicleBody);
    expect(res.status).toBe(404);
  });

  it('I28 — 403 when non-admin tries to update', async () => {
    const { app, db } = await buildTestApp();
    const { id } = seedVehicle(db);
    const res = await request(app).put(`/api/vehicles/${id}`)
      .set('Authorization', `Bearer ${userToken()}`)
      .send(validVehicleBody);
    expect(res.status).toBe(403);
  });

  it('I29 — 401 when unauthenticated', async () => {
    const { app, db } = await buildTestApp();
    const { id } = seedVehicle(db);
    const res = await request(app).put(`/api/vehicles/${id}`)
      .send(validVehicleBody);
    expect(res.status).toBe(401);
  });

  it('I30 — 400 when update payload has invalid values', async () => {
    const { app, db } = await buildTestApp();
    const { id } = seedVehicle(db);
    const res = await request(app).put(`/api/vehicles/${id}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ ...validVehicleBody, price: -999 });
    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/vehicles/:id ─────────────────────────────────────────────────

describe('DELETE /api/vehicles/:id', () => {
  it('I31 — 204 when admin deletes existing vehicle', async () => {
    const { app, db } = await buildTestApp();
    const { id } = seedVehicle(db);
    const res = await request(app).delete(`/api/vehicles/${id}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(204);
  });

  it('I32 — 403 when regular user tries to delete', async () => {
    const { app, db } = await buildTestApp();
    const { id } = seedVehicle(db);
    const res = await request(app).delete(`/api/vehicles/${id}`)
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(403);
  });

  it('I33 — 401 when unauthenticated user tries to delete', async () => {
    const { app, db } = await buildTestApp();
    const { id } = seedVehicle(db);
    const res = await request(app).delete(`/api/vehicles/${id}`);
    expect(res.status).toBe(401);
  });

  it('I34 — 404 for non-existent vehicle ID', async () => {
    const { app } = await buildTestApp();
    const res = await request(app).delete('/api/vehicles/9999')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });
});

// ─── GET /api/vehicles/search ─────────────────────────────────────────────────

describe('GET /api/vehicles/search', () => {
  let app: express.Express;
  let db: DatabaseSync;

  beforeEach(async () => {
    ({ app, db } = await buildTestApp());
    seedVehicle(db, { make: 'Toyota', category: 'Sedan', price: 25000 });
    seedVehicle(db, { make: 'Honda',  category: 'SUV',   price: 32000 });
    seedVehicle(db, { make: 'Ford',   category: 'Truck', price: 45000 });
  });

  it('I35 — filters by make', async () => {
    const res = await request(app).get('/api/vehicles/search?make=Toyota')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].make).toBe('Toyota');
  });

  it('I36 — filters by category', async () => {
    const res = await request(app).get('/api/vehicles/search?category=SUV')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].category).toBe('SUV');
  });

  it('I37 — filters by minPrice', async () => {
    const res = await request(app).get('/api/vehicles/search?minPrice=30000')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('I38 — filters by maxPrice', async () => {
    const res = await request(app).get('/api/vehicles/search?maxPrice=30000')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].make).toBe('Toyota');
  });

  it('I39 — returns empty array when no vehicle matches', async () => {
    const res = await request(app).get('/api/vehicles/search?make=Ferrari')
      .set('Authorization', `Bearer ${userToken()}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('I40 — 401 when search is accessed unauthenticated', async () => {
    const res = await request(app).get('/api/vehicles/search?make=Toyota');
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/vehicles/:id/purchase ─────────────────────────────────────────

describe('POST /api/vehicles/:id/purchase', () => {
  it('I41 — 201 with remaining quantity when in stock', async () => {
    const { app, db } = await buildTestApp();
    seedUser(db, { email: 'user@test.com' });
    const { id } = seedVehicle(db, { quantity: 3 });
    const res = await request(app).post(`/api/vehicles/${id}/purchase`)
      .set('Authorization', `Bearer ${userToken({ id: 1, email: 'user@test.com' })}`);
    expect(res.status).toBe(201);
    expect(res.body.remaining).toBe(2);
  });

  it('I42 — 409 when vehicle is out of stock', async () => {
    const { app, db } = await buildTestApp();
    seedUser(db, { email: 'user@test.com' });
    const { id } = seedVehicle(db, { quantity: 0 });
    const res = await request(app).post(`/api/vehicles/${id}/purchase`)
      .set('Authorization', `Bearer ${userToken({ id: 1, email: 'user@test.com' })}`);
    expect(res.status).toBe(409);
  });

  it('I43 — 401 when no token provided', async () => {
    const { app, db } = await buildTestApp();
    const { id } = seedVehicle(db);
    const res = await request(app).post(`/api/vehicles/${id}/purchase`);
    expect(res.status).toBe(401);
  });

  it('I44 — 404 for non-existent vehicle', async () => {
    const { app, db } = await buildTestApp();
    seedUser(db, { email: 'user@test.com' });
    const res = await request(app).post('/api/vehicles/9999/purchase')
      .set('Authorization', `Bearer ${userToken({ id: 1, email: 'user@test.com' })}`);
    expect(res.status).toBe(404);
  });
});

// ─── POST /api/vehicles/:id/restock ──────────────────────────────────────────

describe('POST /api/vehicles/:id/restock', () => {
  it('I45 — 200 with updated vehicle when admin restocks', async () => {
    const { app, db } = await buildTestApp();
    const { id } = seedVehicle(db, { quantity: 5 });
    const res = await request(app).post(`/api/vehicles/${id}/restock`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ quantity: 10 });
    expect(res.status).toBe(200);
    expect(res.body.quantity).toBe(15);
  });

  it('I46 — 403 when regular user tries to restock', async () => {
    const { app, db } = await buildTestApp();
    const { id } = seedVehicle(db);
    const res = await request(app).post(`/api/vehicles/${id}/restock`)
      .set('Authorization', `Bearer ${userToken()}`)
      .send({ quantity: 10 });
    expect(res.status).toBe(403);
  });

  it('I47 — 400 when quantity is 0', async () => {
    const { app, db } = await buildTestApp();
    const { id } = seedVehicle(db);
    const res = await request(app).post(`/api/vehicles/${id}/restock`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ quantity: 0 });
    expect(res.status).toBe(400);
  });

  it('I48 — 404 for non-existent vehicle', async () => {
    const { app } = await buildTestApp();
    const res = await request(app).post('/api/vehicles/9999/restock')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ quantity: 10 });
    expect(res.status).toBe(404);
  });
});

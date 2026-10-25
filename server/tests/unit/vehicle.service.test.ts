/**
 * tests/unit/vehicle.service.test.ts
 *
 * Unit tests for vehicle.service.ts
 * Phase 2 & 3 — RED: All tests will FAIL until the service is implemented.
 *
 * Run:  npm test -- vehicle.service
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DatabaseSync } from 'node:sqlite';
import {
  listVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  searchVehicles,
  purchaseVehicle,
  restockVehicle,
} from '../../src/services/vehicle.service.js';
import { createTestDb, seedUser, seedVehicle } from '../helpers/db.js';

// A valid vehicle payload — used as the base for most tests
const validVehicle = {
  make: 'Toyota',
  model: 'Camry',
  year: 2023,
  category: 'Sedan',
  color: 'White',
  price: 25000,
  quantity: 5,
  description: 'A reliable sedan.',
};

let db: DatabaseSync;

beforeEach(() => {
  // Fresh in-memory DB for each test — zero shared state
  db = createTestDb();
});

// ─── listVehicles ─────────────────────────────────────────────────────────────

describe('listVehicles', () => {
  it('U17 — returns an empty array when no vehicles exist', () => {
    expect(listVehicles(db)).toEqual([]);
  });

  it('U18 — returns all seeded vehicles', () => {
    seedVehicle(db, { make: 'Toyota', model: 'Camry' });
    seedVehicle(db, { make: 'Honda', model: 'Civic' });
    const result = listVehicles(db);
    expect(result).toHaveLength(2);
  });

  it('U19 — vehicles are returned newest first (by id desc)', () => {
    seedVehicle(db, { make: 'Toyota' });
    seedVehicle(db, { make: 'Honda' });
    const result = listVehicles(db);
    expect(result[0].make).toBe('Honda'); // inserted last, returned first
  });
});

// ─── createVehicle ────────────────────────────────────────────────────────────

describe('createVehicle', () => {
  it('U20 — creates and returns a vehicle with a numeric ID', () => {
    const vehicle = createVehicle(db, validVehicle);
    expect(typeof vehicle.id).toBe('number');
    expect(vehicle.id).toBeGreaterThan(0);
    expect(vehicle.make).toBe('Toyota');
    expect(vehicle.model).toBe('Camry');
  });

  it('U21 — returned vehicle matches the input fields', () => {
    const vehicle = createVehicle(db, validVehicle);
    expect(vehicle.year).toBe(2023);
    expect(vehicle.price).toBe(25000);
    expect(vehicle.quantity).toBe(5);
    expect(vehicle.category).toBe('Sedan');
  });

  it('U22 — throws ValidationError when make is missing', () => {
    const bad = { ...validVehicle, make: '' };
    expect(() => createVehicle(db, bad as any)).toThrow(
      expect.objectContaining({ statusCode: 400 }),
    );
  });

  it('U23 — throws ValidationError when price is negative', () => {
    const bad = { ...validVehicle, price: -500 };
    expect(() => createVehicle(db, bad as any)).toThrow(
      expect.objectContaining({ statusCode: 400 }),
    );
  });

  it('U24 — throws ValidationError when year is out of range', () => {
    const bad = { ...validVehicle, year: 1800 };
    expect(() => createVehicle(db, bad as any)).toThrow(
      expect.objectContaining({ statusCode: 400 }),
    );
  });
});

// ─── updateVehicle ────────────────────────────────────────────────────────────

describe('updateVehicle', () => {
  it('U25 — updates and returns the modified vehicle', () => {
    const { id } = seedVehicle(db, { make: 'Toyota', price: 25000 });
    const updated = updateVehicle(db, id, { ...validVehicle, make: 'Honda', price: 28000 });
    expect(updated.make).toBe('Honda');
    expect(updated.price).toBe(28000);
  });

  it('U26 — throws NotFoundError when ID does not exist', () => {
    expect(() => updateVehicle(db, 9999, validVehicle)).toThrow(
      expect.objectContaining({ statusCode: 404 }),
    );
  });
});

// ─── deleteVehicle ────────────────────────────────────────────────────────────

describe('deleteVehicle', () => {
  it('U27 — deletes the vehicle so it no longer appears in list', () => {
    const { id } = seedVehicle(db);
    deleteVehicle(db, id);
    expect(listVehicles(db)).toHaveLength(0);
  });

  it('U28 — throws NotFoundError when ID does not exist', () => {
    expect(() => deleteVehicle(db, 9999)).toThrow(
      expect.objectContaining({ statusCode: 404 }),
    );
  });
});

// ─── searchVehicles ───────────────────────────────────────────────────────────

describe('searchVehicles', () => {
  beforeEach(() => {
    seedVehicle(db, { make: 'Toyota', model: 'Camry',  category: 'Sedan', price: 25000, quantity: 5 });
    seedVehicle(db, { make: 'Honda',  model: 'CR-V',   category: 'SUV',   price: 32000, quantity: 3 });
    seedVehicle(db, { make: 'Ford',   model: 'F-150',  category: 'Truck', price: 45000, quantity: 0 });
  });

  it('U29 — returns all vehicles when no filters applied', () => {
    expect(searchVehicles(db, {})).toHaveLength(3);
  });

  it('U30 — filters by make (case-insensitive)', () => {
    const result = searchVehicles(db, { make: 'toyota' });
    expect(result).toHaveLength(1);
    expect(result[0].make).toBe('Toyota');
  });

  it('U31 — filters by model (partial match)', () => {
    const result = searchVehicles(db, { model: 'CR' });
    expect(result).toHaveLength(1);
    expect(result[0].model).toBe('CR-V');
  });

  it('U32 — filters by category (exact)', () => {
    const result = searchVehicles(db, { category: 'SUV' });
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe('SUV');
  });

  it('U33 — filters by minPrice', () => {
    const result = searchVehicles(db, { minPrice: 30000 });
    expect(result).toHaveLength(2); // Honda 32k + Ford 45k
    result.forEach(v => expect(v.price).toBeGreaterThanOrEqual(30000));
  });

  it('U34 — filters by maxPrice', () => {
    const result = searchVehicles(db, { maxPrice: 30000 });
    expect(result).toHaveLength(1); // Toyota 25k only
    expect(result[0].make).toBe('Toyota');
  });

  it('U35 — returns empty array when no vehicle matches', () => {
    expect(searchVehicles(db, { make: 'Ferrari' })).toHaveLength(0);
  });

  it('U36 — filters by free-text q (matches make or model)', () => {
    const result = searchVehicles(db, { q: 'F-150' });
    expect(result).toHaveLength(1);
    expect(result[0].model).toBe('F-150');
  });
});

// ─── purchaseVehicle ──────────────────────────────────────────────────────────

describe('purchaseVehicle', () => {
  it('U37 — decrements quantity by 1 and returns remaining count', () => {
    const { id: userId } = seedUser(db);
    const { id: vehicleId } = seedVehicle(db, { quantity: 3 });
    const result = purchaseVehicle(db, vehicleId, userId);
    expect(result.remaining).toBe(2);
    expect(result.vehicleId).toBe(vehicleId);
    expect(typeof result.purchaseId).toBe('number');
  });

  it('U38 — throws OutOfStockError when quantity is 0', () => {
    const { id: userId } = seedUser(db);
    const { id: vehicleId } = seedVehicle(db, { quantity: 0 });
    expect(() => purchaseVehicle(db, vehicleId, userId)).toThrow(
      expect.objectContaining({ statusCode: 409 }),
    );
  });

  it('U39 — throws NotFoundError for a non-existent vehicle ID', () => {
    const { id: userId } = seedUser(db);
    expect(() => purchaseVehicle(db, 9999, userId)).toThrow(
      expect.objectContaining({ statusCode: 404 }),
    );
  });

  it('U40 — creates a purchase record in the purchases table', () => {
    const { id: userId } = seedUser(db);
    const { id: vehicleId } = seedVehicle(db, { quantity: 2 });
    const result = purchaseVehicle(db, vehicleId, userId);
    const row = db.prepare('SELECT * FROM purchases WHERE id = ?').get(result.purchaseId) as any;
    expect(row).toBeDefined();
    expect(row.user_id).toBe(userId);
    expect(row.vehicle_id).toBe(vehicleId);
  });
});

// ─── restockVehicle ───────────────────────────────────────────────────────────

describe('restockVehicle', () => {
  it('U41 — increments quantity by the given amount', () => {
    const { id } = seedVehicle(db, { quantity: 5 });
    const updated = restockVehicle(db, id, 10);
    expect(updated.quantity).toBe(15);
  });

  it('U42 — throws ValidationError when restock quantity is 0', () => {
    const { id } = seedVehicle(db, { quantity: 5 });
    expect(() => restockVehicle(db, id, 0)).toThrow(
      expect.objectContaining({ statusCode: 400 }),
    );
  });

  it('U43 — throws ValidationError when restock quantity is negative', () => {
    const { id } = seedVehicle(db, { quantity: 5 });
    expect(() => restockVehicle(db, id, -3)).toThrow(
      expect.objectContaining({ statusCode: 400 }),
    );
  });

  it('U44 — throws NotFoundError for a non-existent vehicle ID', () => {
    expect(() => restockVehicle(db, 9999, 10)).toThrow(
      expect.objectContaining({ statusCode: 404 }),
    );
  });
});

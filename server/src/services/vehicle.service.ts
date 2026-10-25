/**
 * services/vehicle.service.ts
 *
 * Business logic for vehicle CRUD, search, purchase, and restock.
 * Services receive DatabaseSync instances for clean test isolation.
 */

import { DatabaseSync } from 'node:sqlite';
import type {
  Vehicle,
  CreateVehicleInput,
  UpdateVehicleInput,
  VehicleSearchParams,
  PurchaseResult,
} from '../types/index.js';
import {
  NotFoundError,
  ValidationError,
  OutOfStockError,
} from '../types/index.js';
import { vehicleSchema, restockSchema } from '../validators/vehicle.schema.js';

// ─── SELECT fragment reused in all vehicle queries ────────────────────────────
export const VEHICLE_SELECT = `
  SELECT
    id, make, model, year, category, color, price, quantity, description,
    dealer_id as dealerId,
    created_at as createdAt
  FROM vehicles
`;

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/** Returns all vehicles ordered by newest first. */
export function listVehicles(db: DatabaseSync): Vehicle[] {
  return db.prepare(`${VEHICLE_SELECT} ORDER BY id DESC`).all() as unknown as Vehicle[];
}

/** Returns a single vehicle by ID. Throws NotFoundError if ID does not exist. */
export function getVehicleById(db: DatabaseSync, id: number): Vehicle {
  const row = db.prepare(`${VEHICLE_SELECT} WHERE id = ?`).get(id) as unknown as Vehicle | undefined;
  if (!row) {
    throw new NotFoundError('Vehicle not found.');
  }
  return row;
}

/** Creates a new vehicle and returns the persisted record. */
export function createVehicle(db: DatabaseSync, input: CreateVehicleInput): Vehicle {
  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message);
  }

  const { make, model, year, category, color, price, quantity, description, dealerId } = parsed.data;

  const result = db.prepare(`
    INSERT INTO vehicles (make, model, year, category, color, price, quantity, description, dealer_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    make.trim(),
    model.trim(),
    year,
    category.trim(),
    color || 'White',
    price,
    quantity,
    description || '',
    dealerId ?? null,
  );

  return getVehicleById(db, Number(result.lastInsertRowid));
}

/** Updates an existing vehicle. Throws NotFoundError if ID does not exist. */
export function updateVehicle(db: DatabaseSync, id: number, input: UpdateVehicleInput): Vehicle {
  // Ensure vehicle exists before validating/updating
  getVehicleById(db, id);

  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message);
  }

  const { make, model, year, category, color, price, quantity, description, dealerId } = parsed.data;

  db.prepare(`
    UPDATE vehicles
    SET make = ?, model = ?, year = ?, category = ?, color = ?, price = ?, quantity = ?, description = ?, dealer_id = ?
    WHERE id = ?
  `).run(
    make.trim(),
    model.trim(),
    year,
    category.trim(),
    color || 'White',
    price,
    quantity,
    description || '',
    dealerId ?? null,
    id,
  );

  return getVehicleById(db, id);
}

/** Deletes a vehicle. Throws NotFoundError if ID does not exist. */
export function deleteVehicle(db: DatabaseSync, id: number): void {
  // Ensure vehicle exists before deleting
  getVehicleById(db, id);

  db.prepare('DELETE FROM vehicles WHERE id = ?').run(id);
}

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * Searches vehicles by make, model, category, and/or price range.
 * All params are optional — omitting all returns all vehicles.
 */
export function searchVehicles(db: DatabaseSync, params: VehicleSearchParams): Vehicle[] {
  const conditions: string[] = [];
  const bindings: any[] = [];

  if (params.q && params.q.trim()) {
    const qTerm = `%${params.q.trim()}%`;
    conditions.push('(make LIKE ? OR model LIKE ? OR category LIKE ?)');
    bindings.push(qTerm, qTerm, qTerm);
  }

  if (params.make && params.make.trim()) {
    conditions.push('make LIKE ?');
    bindings.push(`%${params.make.trim()}%`);
  }

  if (params.model && params.model.trim()) {
    conditions.push('model LIKE ?');
    bindings.push(`%${params.model.trim()}%`);
  }

  if (params.category && params.category.trim()) {
    conditions.push('category = ?');
    bindings.push(params.category.trim());
  }

  if (typeof params.minPrice === 'number' && !isNaN(params.minPrice)) {
    conditions.push('price >= ?');
    bindings.push(params.minPrice);
  }

  if (typeof params.maxPrice === 'number' && !isNaN(params.maxPrice)) {
    conditions.push('price <= ?');
    bindings.push(params.maxPrice);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `${VEHICLE_SELECT} ${whereClause} ORDER BY id DESC`;

  return db.prepare(sql).all(...bindings) as unknown as Vehicle[];
}

// ─── Inventory ────────────────────────────────────────────────────────────────

/**
 * Purchases a vehicle (decrements quantity by 1).
 * Uses an atomic SQLite transaction to prevent race conditions.
 * Throws OutOfStockError if quantity is 0.
 * Throws NotFoundError if the vehicle does not exist.
 */
export function purchaseVehicle(
  db: DatabaseSync,
  vehicleId: number,
  userId: number,
): PurchaseResult {
  try {
    db.exec('BEGIN IMMEDIATE');

    const vehicle = db
      .prepare('SELECT id, price, quantity FROM vehicles WHERE id = ?')
      .get(vehicleId) as { id: number; price: number; quantity: number } | undefined;

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found.');
    }

    if (vehicle.quantity < 1) {
      throw new OutOfStockError('This vehicle is currently out of stock.');
    }

    db.prepare('UPDATE vehicles SET quantity = quantity - 1 WHERE id = ?').run(vehicle.id);
    const tx = db
      .prepare('INSERT INTO purchases (user_id, vehicle_id, amount) VALUES (?, ?, ?)')
      .run(userId, vehicle.id, vehicle.price);

    db.exec('COMMIT');

    return {
      purchaseId: Number(tx.lastInsertRowid),
      vehicleId,
      remaining: vehicle.quantity - 1,
    };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

/**
 * Restocks a vehicle (increments quantity by the given amount).
 * Throws NotFoundError if the vehicle does not exist.
 * Throws ValidationError if quantity < 1.
 */
export function restockVehicle(db: DatabaseSync, vehicleId: number, quantity: number): Vehicle {
  const parsed = restockSchema.safeParse({ quantity });
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message);
  }

  // Ensure vehicle exists before updating
  getVehicleById(db, vehicleId);

  db.prepare('UPDATE vehicles SET quantity = quantity + ? WHERE id = ?').run(
    parsed.data.quantity,
    vehicleId,
  );

  return getVehicleById(db, vehicleId);
}

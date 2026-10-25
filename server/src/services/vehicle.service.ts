/**
 * services/vehicle.service.ts
 *
 * Business logic for vehicle CRUD, search, purchase, and restock.
 * Services receive DatabaseSync instances for clean test isolation.
 */

import { DatabaseSync } from 'node:sqlite';
import type { StatementSync } from 'node:sqlite';
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
import { vehicleSchema, restockSchema, type VehicleInput } from '../validators/vehicle.schema.js';

type NormalizedVehiclePayload = Pick<
  VehicleInput,
  'make' | 'model' | 'year' | 'category' | 'color' | 'price' | 'quantity' | 'description'
> & { dealerId: number | null };

// ─── Query Fragments & Constants ─────────────────────────────────────────────

export const VEHICLE_SELECT = `
  SELECT
    id, make, model, year, category, color, price, quantity, description,
    dealer_id as dealerId,
    created_at as createdAt
  FROM vehicles
`;

// WeakMap cache for prepared statements keyed by database instance
const statementCache = new WeakMap<DatabaseSync, Map<string, StatementSync>>();

/**
 * Returns a cached prepared statement for a given database instance,
 * avoiding duplicate statement compilation overhead on repetitive calls.
 * The SQL is composed only from fixed query fragments; all caller values are
 * supplied as bindings.
 *
 * @param db Database connection that owns the statement.
 * @param sql Fixed SQL query text to prepare or retrieve.
 * @returns A prepared statement associated with the given database.
 */
function getCachedStatement(db: DatabaseSync, sql: string): StatementSync {
  let cache = statementCache.get(db);
  if (!cache) {
    cache = new Map();
    statementCache.set(db, cache);
  }

  let stmt = cache.get(sql);
  if (!stmt) {
    stmt = db.prepare(sql);
    cache.set(sql, stmt);
  }
  return stmt;
}

/**
 * Normalizes validated vehicle fields before persistence.
 *
 * @param data Vehicle payload after Zod validation and default application.
 * @returns A trimmed payload with explicit defaults for optional fields.
 */
function sanitizeVehiclePayload(data: VehicleInput): NormalizedVehiclePayload {
  return {
    make: data.make.trim(),
    model: data.model.trim(),
    year: data.year,
    category: data.category.trim(),
    color: data.color?.trim() || 'White',
    price: data.price,
    quantity: data.quantity,
    description: data.description?.trim() || '',
    dealerId: data.dealerId ?? null,
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Returns all vehicles ordered by newest first.
 */
export function listVehicles(db: DatabaseSync): Vehicle[] {
  const sql = `${VEHICLE_SELECT} ORDER BY id DESC`;
  return getCachedStatement(db, sql).all() as unknown as Vehicle[];
}

/**
 * Returns a single vehicle by ID.
 *
 * @throws {NotFoundError} If vehicle with specified ID does not exist.
 */
export function getVehicleById(db: DatabaseSync, id: number): Vehicle {
  const sql = `${VEHICLE_SELECT} WHERE id = ?`;
  const row = getCachedStatement(db, sql).get(id) as unknown as Vehicle | undefined;
  if (!row) {
    throw new NotFoundError('Vehicle not found.');
  }
  return row;
}

/**
 * Creates a new vehicle record and returns the persisted entity.
 *
 * @throws {ValidationError} If input payload fails schema requirements.
 */
export function createVehicle(db: DatabaseSync, input: CreateVehicleInput): Vehicle {
  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message);
  }

  const sanitized = sanitizeVehiclePayload(parsed.data);

  const insertSql = `
    INSERT INTO vehicles (make, model, year, category, color, price, quantity, description, dealer_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const result = getCachedStatement(db, insertSql).run(
    sanitized.make,
    sanitized.model,
    sanitized.year,
    sanitized.category,
    sanitized.color,
    sanitized.price,
    sanitized.quantity,
    sanitized.description,
    sanitized.dealerId,
  );

  return getVehicleById(db, Number(result.lastInsertRowid));
}

/**
 * Updates an existing vehicle.
 *
 * @throws {NotFoundError} If target vehicle does not exist.
 * @throws {ValidationError} If update input is invalid.
 */
export function updateVehicle(db: DatabaseSync, id: number, input: UpdateVehicleInput): Vehicle {
  // Ensure vehicle exists before updating
  getVehicleById(db, id);

  const parsed = vehicleSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message);
  }

  const sanitized = sanitizeVehiclePayload(parsed.data);

  const updateSql = `
    UPDATE vehicles
    SET make = ?, model = ?, year = ?, category = ?, color = ?, price = ?, quantity = ?, description = ?, dealer_id = ?
    WHERE id = ?
  `;

  getCachedStatement(db, updateSql).run(
    sanitized.make,
    sanitized.model,
    sanitized.year,
    sanitized.category,
    sanitized.color,
    sanitized.price,
    sanitized.quantity,
    sanitized.description,
    sanitized.dealerId,
    id,
  );

  return getVehicleById(db, id);
}

/**
 * Deletes a vehicle by ID.
 *
 * @throws {NotFoundError} If target vehicle does not exist.
 */
export function deleteVehicle(db: DatabaseSync, id: number): void {
  // Ensure vehicle exists before deleting
  getVehicleById(db, id);

  const deleteSql = 'DELETE FROM vehicles WHERE id = ?';
  getCachedStatement(db, deleteSql).run(id);
}

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * Searches vehicles with optional filters and bounded pagination.
 * Values are always passed as SQLite bindings; pagination preserves the
 * existing unpaginated behavior when neither pagination option is provided.
 * Results are ordered by descending vehicle ID for stable page boundaries.
 *
 * @param db Database connection to query.
 * @param params Optional filter and pagination values.
 * @returns Matching vehicles in newest-first order.
 */
export function searchVehicles(db: DatabaseSync, params: VehicleSearchParams): Vehicle[] {
  const conditions: string[] = [];
  const bindings: Array<string | number> = [];

  const trimmedQ = params.q?.trim();
  if (trimmedQ) {
    const qTerm = `%${trimmedQ}%`;
    conditions.push('(make LIKE ? OR model LIKE ? OR category LIKE ?)');
    bindings.push(qTerm, qTerm, qTerm);
  }

  const trimmedMake = params.make?.trim();
  if (trimmedMake) {
    conditions.push('make LIKE ?');
    bindings.push(`%${trimmedMake}%`);
  }

  const trimmedModel = params.model?.trim();
  if (trimmedModel) {
    conditions.push('model LIKE ?');
    bindings.push(`%${trimmedModel}%`);
  }

  const trimmedCategory = params.category?.trim();
  if (trimmedCategory) {
    conditions.push('category = ?');
    bindings.push(trimmedCategory);
  }

  if (typeof params.minPrice === 'number' && Number.isFinite(params.minPrice)) {
    conditions.push('price >= ?');
    bindings.push(params.minPrice);
  }

  if (typeof params.maxPrice === 'number' && Number.isFinite(params.maxPrice)) {
    conditions.push('price <= ?');
    bindings.push(params.maxPrice);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const hasPagination = params.limit !== undefined || params.offset !== undefined;
  const paginationClause = hasPagination ? ' LIMIT ? OFFSET ?' : '';
  const sql = `${VEHICLE_SELECT} ${whereClause} ORDER BY id DESC${paginationClause}`;

  if (hasPagination) {
    bindings.push(params.limit ?? -1, params.offset ?? 0);
  }

  return getCachedStatement(db, sql).all(...bindings) as unknown as Vehicle[];
}

// ─── Inventory ────────────────────────────────────────────────────────────────

/**
 * Purchases a vehicle (decrements quantity by 1).
 * Executes inside an atomic SQLite transaction (BEGIN IMMEDIATE) with rollback safety.
 *
 * @throws {NotFoundError} If vehicle does not exist.
 * @throws {OutOfStockError} If inventory is 0.
 */
export function purchaseVehicle(
  db: DatabaseSync,
  vehicleId: number,
  userId: number,
): PurchaseResult {
  try {
    db.exec('BEGIN IMMEDIATE');

    const selectSql = 'SELECT id, price, quantity FROM vehicles WHERE id = ?';
    const vehicle = getCachedStatement(db, selectSql).get(vehicleId) as
      | { id: number; price: number; quantity: number }
      | undefined;

    if (!vehicle) {
      throw new NotFoundError('Vehicle not found.');
    }

    if (vehicle.quantity < 1) {
      throw new OutOfStockError('This vehicle is currently out of stock.');
    }

    const updateSql = 'UPDATE vehicles SET quantity = quantity - 1 WHERE id = ?';
    getCachedStatement(db, updateSql).run(vehicle.id);

    const insertPurchaseSql = 'INSERT INTO purchases (user_id, vehicle_id, amount) VALUES (?, ?, ?)';
    const tx = getCachedStatement(db, insertPurchaseSql).run(userId, vehicle.id, vehicle.price);

    db.exec('COMMIT');

    return {
      purchaseId: Number(tx.lastInsertRowid),
      vehicleId,
      remaining: vehicle.quantity - 1,
    };
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Catch rollback error in case transaction was not open
    }
    throw err;
  }
}

/**
 * Restocks a vehicle (increments quantity by the given amount).
 *
 * @throws {ValidationError} If quantity < 1 or invalid.
 * @throws {NotFoundError} If vehicle does not exist.
 */
export function restockVehicle(db: DatabaseSync, vehicleId: number, quantity: number): Vehicle {
  const parsed = restockSchema.safeParse({ quantity });
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message);
  }

  // Ensure vehicle exists before updating
  getVehicleById(db, vehicleId);

  const restockSql = 'UPDATE vehicles SET quantity = quantity + ? WHERE id = ?';
  getCachedStatement(db, restockSql).run(parsed.data.quantity, vehicleId);

  return getVehicleById(db, vehicleId);
}

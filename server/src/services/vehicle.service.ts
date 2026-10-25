/**
 * services/vehicle.service.ts
 *
 * Business logic for vehicle CRUD, search, purchase, and restock.
 * Services receive a DB instance so they are unit-testable without Express.
 *
 * STUB — implementations added in Phase 2 & 3 (RED → GREEN → REFACTOR).
 */

import { DatabaseSync } from 'node:sqlite';
import type {
  Vehicle,
  CreateVehicleInput,
  UpdateVehicleInput,
  VehicleSearchParams,
  PurchaseResult,
} from '../types/index.js';

// ─── SELECT fragment reused in all vehicle queries ────────────────────────────
export const VEHICLE_SELECT = `
  SELECT
    id, make, model, year, category, color, price, quantity, description,
    created_at as createdAt
  FROM vehicles
`;

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/** Returns all vehicles ordered by newest first. */
export function listVehicles(db: DatabaseSync): Vehicle[] {
  // TODO (Phase 2 - GREEN): implement
  throw new Error('Not implemented');
}

/** Creates a new vehicle and returns the persisted record. */
export function createVehicle(db: DatabaseSync, input: CreateVehicleInput): Vehicle {
  // TODO (Phase 2 - GREEN): implement
  throw new Error('Not implemented');
}

/** Updates an existing vehicle. Throws NotFoundError if ID does not exist. */
export function updateVehicle(db: DatabaseSync, id: number, input: UpdateVehicleInput): Vehicle {
  // TODO (Phase 2 - GREEN): implement
  throw new Error('Not implemented');
}

/** Deletes a vehicle. Throws NotFoundError if ID does not exist. */
export function deleteVehicle(db: DatabaseSync, id: number): void {
  // TODO (Phase 2 - GREEN): implement
  throw new Error('Not implemented');
}

// ─── Search ───────────────────────────────────────────────────────────────────

/**
 * Searches vehicles by make, model, category, and/or price range.
 * All params are optional — omitting all returns all vehicles.
 */
export function searchVehicles(db: DatabaseSync, params: VehicleSearchParams): Vehicle[] {
  // TODO (Phase 2 - GREEN): implement
  throw new Error('Not implemented');
}

// ─── Inventory ────────────────────────────────────────────────────────────────

/**
 * Purchases a vehicle (decrements quantity by 1, creates purchase record).
 * Uses an atomic SQLite transaction to prevent race conditions.
 * Throws OutOfStockError if quantity is 0.
 * Throws NotFoundError if the vehicle does not exist.
 */
export function purchaseVehicle(
  db: DatabaseSync,
  vehicleId: number,
  userId: number,
): PurchaseResult {
  // TODO (Phase 3 - GREEN): implement
  throw new Error('Not implemented');
}

/**
 * Restocks a vehicle (increments quantity by the given amount).
 * Throws NotFoundError if the vehicle does not exist.
 * Throws ValidationError if quantity < 1.
 */
export function restockVehicle(db: DatabaseSync, vehicleId: number, quantity: number): Vehicle {
  // TODO (Phase 3 - GREEN): implement
  throw new Error('Not implemented');
}

/**
 * tests/helpers/db.ts
 *
 * Test database factory — creates a fresh in-memory SQLite database
 * for each test suite using the built-in node:sqlite module.
 *
 * Each test gets an isolated DB — no shared state, no disk I/O, no cleanup needed.
 *
 * Usage:
 *   import { createTestDb, seedUser, seedVehicle } from '../helpers/db.js';
 *   const db = createTestDb(); // fresh :memory: database
 */

import { DatabaseSync } from 'node:sqlite';
import { createDatabase } from '../../src/db/database.js';

export function createTestDb(): DatabaseSync {
  return createDatabase(':memory:');
}

/**
 * Seeds a test user into the database without going through the API.
 * The password hash is a valid bcrypt hash of 'password123' for convenience.
 */
export function seedUser(
  db: DatabaseSync,
  overrides: Partial<{
    name: string;
    email: string;
    passwordHash: string;
    role: string;
  }> = {},
): { id: number; email: string; role: string } {
  const name = overrides.name ?? 'Test User';
  const email = overrides.email ?? 'test@example.com';
  // bcrypt hash of 'password123' — pre-computed for test speed
  const passwordHash =
    overrides.passwordHash ??
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
  const role = overrides.role ?? 'user';

  const result = db
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(name, email, passwordHash, role);

  return { id: Number(result.lastInsertRowid), email, role };
}

/**
 * Seeds a test vehicle into the database without going through the API.
 */
export function seedVehicle(
  db: DatabaseSync,
  overrides: Partial<{
    make: string;
    model: string;
    year: number;
    category: string;
    color: string;
    price: number;
    quantity: number;
    description: string;
  }> = {},
): { id: number } {
  const make = overrides.make ?? 'Toyota';
  const model = overrides.model ?? 'Camry';
  const year = overrides.year ?? 2023;
  const category = overrides.category ?? 'Sedan';
  const color = overrides.color ?? 'White';
  const price = overrides.price ?? 25000;
  const quantity = overrides.quantity ?? 5;
  const description = overrides.description ?? 'A reliable sedan.';

  const result = db
    .prepare(
      `INSERT INTO vehicles (make, model, year, category, color, price, quantity, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(make, model, year, category, color, price, quantity, description);

  return { id: Number(result.lastInsertRowid) };
}

/**
 * database.ts
 *
 * SQLite connection using the built-in node:sqlite module (Node 22+).
 * No native compilation required — zero extra dependencies.
 *
 * The createDatabase() factory is exported so tests can call it with
 * ':memory:' to get a fresh, isolated in-memory database per test suite.
 *
 * NOTE: node:sqlite is experimental in Node 22 and stable in Node 24.
 *       The ExperimentalWarning in Node 22 is cosmetic — the API is stable.
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Creates and configures a SQLite database instance.
 * Pass ':memory:' for an isolated in-memory DB (used in tests).
 */
export function createDatabase(
  dbPath: string = process.env.DATABASE_PATH || 'dealership.db',
): DatabaseSync {
  const resolvedPath =
    dbPath === ':memory:'
      ? ':memory:'
      : path.resolve(__dirname, '../../..', dbPath);

  const db = new DatabaseSync(resolvedPath);

  // Performance + safety pragmas
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  // Schema — idempotent (IF NOT EXISTS guarantees safe re-runs)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      role          TEXT    NOT NULL DEFAULT 'user',
      created_at    TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      make        TEXT    NOT NULL,
      model       TEXT    NOT NULL,
      year        INTEGER NOT NULL CHECK(year >= 1886 AND year <= 2100),
      category    TEXT    NOT NULL,
      color       TEXT    NOT NULL DEFAULT 'White',
      price       REAL    NOT NULL CHECK(price >= 0),
      quantity    INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0),
      description TEXT    NOT NULL DEFAULT '',
      dealer_id   INTEGER REFERENCES users(id),
      created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      vehicle_id  INTEGER NOT NULL REFERENCES vehicles(id),
      amount      REAL    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return db;
}

// Default singleton — used by the running server (not by tests)
const db = createDatabase();
export default db;

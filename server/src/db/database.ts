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
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

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

const bootstrapAdminSchema = z.object({
  email: z.string().trim().email('Bootstrap admin email must be a valid email address.'),
  password: z.string().min(8, 'Bootstrap admin password must be at least 8 characters.'),
});

/**
 * Creates the environment-configured admin on a fresh database, or promotes
 * the matching existing account. The configured password is only used when
 * the account needs to be created and is never stored as plain text.
 *
 * @throws {Error} When only one credential is configured or credentials are invalid.
 */
export function ensureBootstrapAdmin(
  db: DatabaseSync,
  email: string | undefined,
  password: string | undefined,
): void {
  if (email === undefined && password === undefined) return;
  if (!email || !password) {
    throw new Error('Both bootstrap admin email and password must be configured.');
  }

  const parsed = bootstrapAdminSchema.safeParse({ email, password });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Bootstrap admin credentials are invalid.';
    throw new Error(`Invalid bootstrap admin configuration: ${message}`);
  }

  const normalizedEmail = parsed.data.email.toLowerCase();
  const existingUser = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(normalizedEmail) as { id: number } | undefined;

  if (existingUser) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', existingUser.id);
    return;
  }

  const passwordHash = bcrypt.hashSync(parsed.data.password, 10);
  db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run('Dealership Admin', normalizedEmail, passwordHash, 'admin');
}

// Default singleton — used by the running server (not by tests)
const db = createDatabase();
ensureBootstrapAdmin(db, process.env.BOOTSTRAP_ADMIN_EMAIL, process.env.BOOTSTRAP_ADMIN_PASSWORD);
export default db;

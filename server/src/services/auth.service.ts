/**
 * services/auth.service.ts
 *
 * Business logic for user authentication.
 * Pure service functions receiving DatabaseSync instances for clean test isolation.
 */

import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import type { AuthResult, User, UserRow } from '../types/index.js';
import { ConflictError, UnauthorizedError, ValidationError } from '../types/index.js';
import { registerSchema, loginSchema } from '../validators/vehicle.schema.js';
import { signToken } from '../middleware/auth.js';

const BCRYPT_SALT_ROUNDS = 10;

/** Normalizes email by trimming whitespace and converting to lowercase. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ─── Password helpers ─────────────────────────────────────────────────────────

/** Hashes a plain-text password using bcrypt. */
export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, BCRYPT_SALT_ROUNDS);
}

/** Returns true if the plain-text password matches the stored bcrypt hash. */
export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

// ─── Token helpers ────────────────────────────────────────────────────────────

/** Generates a signed JWT for the given user. */
export function generateToken(user: User): string {
  return signToken(user);
}

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Registers a new user with role 'user'.
 * Validates input, enforces email uniqueness, and stores a hashed password.
 *
 * @throws {ValidationError} When payload fails schema validation
 * @throws {ConflictError} When email is already registered
 */
export function register(db: DatabaseSync, input: unknown): AuthResult {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message);
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = normalizeEmail(email);

  const checkStmt = db.prepare('SELECT id FROM users WHERE email = ?');
  const existing = checkStmt.get(normalizedEmail) as { id: number } | undefined;

  if (existing) {
    throw new ConflictError('An account with this email already exists.');
  }

  const passwordHash = hashPassword(password);
  const insertStmt = db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
  );
  const result = insertStmt.run(name.trim(), normalizedEmail, passwordHash, 'user');

  const user: User = {
    id: Number(result.lastInsertRowid),
    name: name.trim(),
    email: normalizedEmail,
    role: 'user',
  };

  return {
    token: generateToken(user),
    user,
  };
}

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Authenticates a user by email and password.
 *
 * @throws {ValidationError} When payload fails schema validation
 * @throws {UnauthorizedError} When credentials do not match
 */
export function login(db: DatabaseSync, input: unknown): AuthResult {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message);
  }

  const { email, password } = parsed.data;
  const normalizedEmail = normalizeEmail(email);

  const queryStmt = db.prepare(
    'SELECT id, name, email, password_hash, role FROM users WHERE email = ?',
  );
  const row = queryStmt.get(normalizedEmail) as UserRow | undefined;

  if (!row || !verifyPassword(password, row.password_hash)) {
    throw new UnauthorizedError('Email or password is incorrect.');
  }

  const user: User = {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
  };

  return {
    token: generateToken(user),
    user,
  };
}

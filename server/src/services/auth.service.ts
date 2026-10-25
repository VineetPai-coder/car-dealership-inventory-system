/**
 * services/auth.service.ts
 *
 * Business logic for user authentication.
 * Services are pure functions that receive a DB instance — fully
 * unit-testable without spinning up Express.
 */

import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import type { AuthResult, User, UserRow } from '../types/index.js';
import { ConflictError, UnauthorizedError, ValidationError } from '../types/index.js';
import { registerSchema, loginSchema } from '../validators/vehicle.schema.js';
import { signToken } from '../middleware/auth.js';

// ─── Password helpers ─────────────────────────────────────────────────────────

/** Hashes a plain-text password using bcrypt (cost factor 10). */
export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

/** Returns true if the plain-text password matches the stored hash. */
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
 * Registers a new user.
 * Throws ConflictError if the email is already taken.
 * Throws ValidationError if the input is invalid.
 */
export function register(db: DatabaseSync, input: unknown): AuthResult {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message);
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const existing = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(normalizedEmail) as { id: number } | undefined;

  if (existing) {
    throw new ConflictError('An account with this email already exists.');
  }

  const passwordHash = hashPassword(password);
  const result = db
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(name, normalizedEmail, passwordHash, 'user');

  const user: User = {
    id: Number(result.lastInsertRowid),
    name,
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
 * Authenticates a user by email + password.
 * Throws UnauthorizedError if credentials are invalid.
 */
export function login(db: DatabaseSync, input: unknown): AuthResult {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    throw new ValidationError(parsed.error.issues[0].message);
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const row = db
    .prepare('SELECT id, name, email, password_hash, role FROM users WHERE email = ?')
    .get(normalizedEmail) as UserRow | undefined;

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

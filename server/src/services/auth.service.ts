/**
 * services/auth.service.ts
 *
 * Business logic for user authentication.
 * Services are pure functions that receive a DB instance — fully
 * unit-testable without spinning up Express.
 *
 * STUB — implementations added in Phase 1 (RED → GREEN → REFACTOR).
 */

import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import type { AuthResult, User } from '../types/index.js';
import { ConflictError, UnauthorizedError, ValidationError } from '../types/index.js';
import { registerSchema, loginSchema } from '../validators/vehicle.schema.js';
import { signToken } from '../middleware/auth.js';

// ─── Password helpers ─────────────────────────────────────────────────────────

/** Hashes a plain-text password using bcrypt (cost factor 10). */
export function hashPassword(plain: string): string {
  // TODO (Phase 1 - GREEN): implement
  throw new Error('Not implemented');
}

/** Returns true if the plain-text password matches the stored hash. */
export function verifyPassword(plain: string, hash: string): boolean {
  // TODO (Phase 1 - GREEN): implement
  throw new Error('Not implemented');
}

// ─── Token helpers ────────────────────────────────────────────────────────────

/** Generates a signed JWT for the given user. */
export function generateToken(user: User): string {
  // TODO (Phase 1 - GREEN): implement
  throw new Error('Not implemented');
}

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Registers a new user.
 * Throws ConflictError if the email is already taken.
 * Throws ValidationError if the input is invalid.
 */
export function register(db: DatabaseSync, input: unknown): AuthResult {
  // TODO (Phase 1 - GREEN): implement
  throw new Error('Not implemented');
}

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Authenticates a user by email + password.
 * Throws UnauthorizedError if credentials are invalid.
 */
export function login(db: DatabaseSync, input: unknown): AuthResult {
  // TODO (Phase 1 - GREEN): implement
  throw new Error('Not implemented');
}

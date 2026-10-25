/**
 * tests/helpers/auth.ts
 *
 * Authentication helpers for integration tests.
 * Provides signed tokens for test users without hitting the register endpoint.
 */

import { signToken } from '../../src/middleware/auth.js';
import type { User } from '../../src/types/index.js';

/** Returns a valid JWT for a regular user (role: 'user') */
export function userToken(overrides: Partial<User> = {}): string {
  return signToken({
    id: overrides.id ?? 1,
    name: overrides.name ?? 'Test User',
    email: overrides.email ?? 'user@test.com',
    role: 'user',
  });
}

/** Returns a valid JWT for an admin user (role: 'admin') */
export function adminToken(overrides: Partial<User> = {}): string {
  return signToken({
    id: overrides.id ?? 999,
    name: overrides.name ?? 'Admin User',
    email: overrides.email ?? 'admin@test.com',
    role: 'admin',
  });
}

/**
 * tests/unit/auth.service.test.ts
 *
 * Unit tests for auth.service.ts
 * Phase 1 — RED: All tests will FAIL until the service is implemented.
 *
 * Run:  npm test -- auth.service
 */

import { describe, it, expect } from '@jest/globals';
import { hashPassword, verifyPassword, generateToken } from '../../src/services/auth.service.js';
import { createTestDb, seedUser } from '../helpers/db.js';
import { register, login } from '../../src/services/auth.service.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// ─── Password helpers ─────────────────────────────────────────────────────────

describe('hashPassword', () => {
  it('U1 — returns a bcrypt hash (not the plain text)', () => {
    const hash = hashPassword('mySecret99');
    expect(hash).not.toBe('mySecret99');
    expect(hash).toMatch(/^\$2[ab]\$/); // bcrypt hash prefix
  });

  it('U2 — produces different hashes for the same input (salt)', () => {
    const hash1 = hashPassword('samePassword1');
    const hash2 = hashPassword('samePassword1');
    expect(hash1).not.toBe(hash2);
  });
});

describe('verifyPassword', () => {
  it('U3 — returns true when plain text matches the hash', () => {
    const hash = bcrypt.hashSync('correctPassword', 10);
    expect(verifyPassword('correctPassword', hash)).toBe(true);
  });

  it('U4 — returns false when plain text does not match', () => {
    const hash = bcrypt.hashSync('correctPassword', 10);
    expect(verifyPassword('wrongPassword', hash)).toBe(false);
  });
});

// ─── Token helpers ────────────────────────────────────────────────────────────

describe('generateToken', () => {
  it('U5 — returns a JWT string', () => {
    const token = generateToken({ id: 1, name: 'Alice', email: 'a@test.com', role: 'user' });
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // header.payload.signature
  });

  it('U6 — token payload contains the user fields', () => {
    const user = { id: 42, name: 'Bob', email: 'b@test.com', role: 'admin' as const };
    const token = generateToken(user);
    const secret = process.env.JWT_SECRET || 'development-only-secret-change-in-production';
    const decoded = jwt.verify(token, secret) as typeof user;
    expect(decoded.id).toBe(42);
    expect(decoded.email).toBe('b@test.com');
    expect(decoded.role).toBe('admin');
  });

  it('U7 — throws when a tampered token is verified', () => {
    const token = generateToken({ id: 1, name: 'Alice', email: 'a@test.com', role: 'user' });
    const tampered = token.slice(0, -5) + 'XXXXX';
    const secret = process.env.JWT_SECRET || 'development-only-secret-change-in-production';
    expect(() => jwt.verify(tampered, secret)).toThrow();
  });
});

// ─── register ─────────────────────────────────────────────────────────────────

describe('register', () => {
  it('U8 — creates a user and returns token + user object', () => {
    const db = createTestDb();
    const result = register(db, { name: 'Alice', email: 'alice@test.com', password: 'password123' });
    expect(result).toHaveProperty('token');
    expect(result.user.email).toBe('alice@test.com');
    expect(result.user.role).toBe('user');
    expect(result.user).not.toHaveProperty('password');
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('U9 — throws ConflictError when email already exists', () => {
    const db = createTestDb();
    register(db, { name: 'Alice', email: 'dup@test.com', password: 'password123' });
    expect(() => register(db, { name: 'Alice2', email: 'dup@test.com', password: 'password456' }))
      .toThrow(expect.objectContaining({ statusCode: 409 }));
  });

  it('U10 — throws ValidationError when password is too short', () => {
    const db = createTestDb();
    expect(() => register(db, { name: 'Bob', email: 'b@test.com', password: 'short' }))
      .toThrow(expect.objectContaining({ statusCode: 400 }));
  });

  it('U11 — throws ValidationError when email is invalid', () => {
    const db = createTestDb();
    expect(() => register(db, { name: 'Bob', email: 'not-an-email', password: 'password123' }))
      .toThrow(expect.objectContaining({ statusCode: 400 }));
  });

  it('U12 — stores a hashed password, never the plain text', () => {
    const db = createTestDb();
    register(db, { name: 'Carol', email: 'carol@test.com', password: 'secret999' });
    const row = db.prepare('SELECT password_hash FROM users WHERE email = ?').get('carol@test.com') as { password_hash: string };
    expect(row.password_hash).not.toBe('secret999');
    expect(bcrypt.compareSync('secret999', row.password_hash)).toBe(true);
  });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe('login', () => {
  it('U13 — returns token + user for correct credentials', () => {
    const db = createTestDb();
    register(db, { name: 'Dave', email: 'dave@test.com', password: 'mypassword1' });
    const result = login(db, { email: 'dave@test.com', password: 'mypassword1' });
    expect(result).toHaveProperty('token');
    expect(result.user.email).toBe('dave@test.com');
  });

  it('U14 — throws UnauthorizedError for wrong password', () => {
    const db = createTestDb();
    register(db, { name: 'Eve', email: 'eve@test.com', password: 'rightPass99' });
    expect(() => login(db, { email: 'eve@test.com', password: 'wrongPass99' }))
      .toThrow(expect.objectContaining({ statusCode: 401 }));
  });

  it('U15 — throws UnauthorizedError for non-existent email', () => {
    const db = createTestDb();
    expect(() => login(db, { email: 'ghost@test.com', password: 'password123' }))
      .toThrow(expect.objectContaining({ statusCode: 401 }));
  });

  it('U16 — login is case-insensitive for email', () => {
    const db = createTestDb();
    register(db, { name: 'Frank', email: 'frank@test.com', password: 'password123' });
    const result = login(db, { email: 'FRANK@TEST.COM', password: 'password123' });
    expect(result.user.email).toBe('frank@test.com');
  });
});

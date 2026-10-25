import bcrypt from 'bcryptjs';
import { createDatabase, ensureBootstrapAdmin } from '../../src/db/database.js';
import type { DatabaseSync } from 'node:sqlite';

describe('ensureBootstrapAdmin', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createDatabase(':memory:');
  });

  afterEach(() => {
    db.close();
  });

  it('does nothing when bootstrap credentials are not configured', () => {
    ensureBootstrapAdmin(db, undefined, undefined);

    expect(db.prepare('SELECT COUNT(*) AS count FROM users').get()).toEqual({ count: 0 });
  });

  it('creates a normalized admin account with a hashed password', () => {
    ensureBootstrapAdmin(db, '  Dealer.Admin@example.com ', 'strong-admin-password');

    const user = db.prepare('SELECT email, role, password_hash FROM users').get() as {
      email: string;
      role: string;
      password_hash: string;
    };
    expect(user.email).toBe('dealer.admin@example.com');
    expect(user.role).toBe('admin');
    expect(user.password_hash).not.toBe('strong-admin-password');
    expect(bcrypt.compareSync('strong-admin-password', user.password_hash)).toBe(true);
  });

  it('promotes an existing configured account without replacing its password', () => {
    db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
      .run('Dealer', 'dealer@example.com', 'existing-hash', 'user');

    ensureBootstrapAdmin(db, 'dealer@example.com', 'another-strong-password');

    expect(db.prepare('SELECT email, role, password_hash FROM users').get()).toEqual({
      email: 'dealer@example.com',
      role: 'admin',
      password_hash: 'existing-hash',
    });
  });

  it('rejects incomplete or invalid bootstrap credentials', () => {
    expect(() => ensureBootstrapAdmin(db, 'dealer@example.com', undefined)).toThrow(/both/i);
    expect(() => ensureBootstrapAdmin(db, 'not-an-email', 'strong-admin-password')).toThrow(/email/i);
    expect(() => ensureBootstrapAdmin(db, 'dealer@example.com', 'short')).toThrow(/8 characters/i);
  });
});

import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';

const db = new DatabaseSync(process.env.DATABASE_PATH || 'gateway.db');
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, provider TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', monthly_fee REAL NOT NULL CHECK(monthly_fee >= 0), transaction_rate REAL NOT NULL DEFAULT 0, quantity INTEGER NOT NULL DEFAULT 0 CHECK(quantity >= 0), color TEXT NOT NULL DEFAULT '#d9f36a', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE IF NOT EXISTS transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id), product_id INTEGER NOT NULL REFERENCES products(id), amount REAL NOT NULL, status TEXT NOT NULL DEFAULT 'succeeded', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
`);

const count = (db.prepare('SELECT COUNT(*) as n FROM products').get() as { n: number }).n;
if (!count) {
  const insert = db.prepare('INSERT INTO products (name,provider,category,description,monthly_fee,transaction_rate,quantity,color) VALUES (?,?,?,?,?,?,?,?)');
  const rows = [
    ['Online checkout','Stripe','Online payments','A flexible checkout built for conversion, with global payment methods and smart retries.',29,2.9,124,'#d9f36a'],
    ['Unified commerce','Adyen','Enterprise','One platform for payments across your website, app, and physical locations.',49,2.6,86,'#c9dcff'],
    ['PayPal Complete','PayPal','Digital wallets','A familiar, frictionless wallet that helps customers check out their way.',19,3.1,0,'#d8c9ff'],
    ['Square Payments','Square','In-person','Take payments in person, online, and on the go with a connected ecosystem.',25,2.75,42,'#ffc8a6'],
    ['Checkout Suite','Checkout.com','Online payments','Modular payment processing with a single integration and real-time insights.',39,2.7,67,'#bfe9de'],
    ['Worldpay Gateway','Worldpay','Enterprise','Reliable global processing with flexible integrations for growing businesses.',35,2.85,31,'#ffd8e1'],
  ];
  for (const row of rows) insert.run(...row);
}

const adminEmail = 'admin@northstar.test';
if (!(db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail))) {
  db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)').run('Northstar Admin', adminEmail, bcrypt.hashSync('gateway123', 10), 'admin');
}

export default db;

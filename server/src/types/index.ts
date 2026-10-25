/**
 * types/index.ts
 *
 * Shared TypeScript types used across services, routes, and middleware.
 * Keeping types in one place avoids circular imports and makes refactoring easier.
 */

import type { Request } from 'express';

// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

export interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  created_at: string;
}

// ─── Vehicle ─────────────────────────────────────────────────────────────────

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  year: number;
  category: string;
  color: string;
  price: number;
  quantity: number;
  description: string;
  createdAt: string;
}

export interface CreateVehicleInput {
  make: string;
  model: string;
  year: number;
  category: string;
  color?: string;
  price: number;
  quantity: number;
  description?: string;
}

export interface UpdateVehicleInput extends CreateVehicleInput {}

export interface VehicleSearchParams {
  q?: string;
  make?: string;
  model?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
}

// ─── Purchase ─────────────────────────────────────────────────────────────────

export interface Purchase {
  id: number;
  userId: number;
  vehicleId: number;
  amount: number;
  createdAt: string;
}

export interface PurchaseResult {
  purchaseId: number;
  vehicleId: number;
  remaining: number;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthResult {
  token: string;
  user: User;
}

// ─── Express Extensions ──────────────────────────────────────────────────────

/** Express Request extended with the authenticated user payload */
export interface AuthRequest extends Request {
  user?: User;
}

// ─── Error Classes ────────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found.') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
    this.name = 'ValidationError';
  }
}

export class OutOfStockError extends AppError {
  constructor(message = 'This vehicle is currently out of stock.') {
    super(409, message);
    this.name = 'OutOfStockError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required.') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Admin access required.') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

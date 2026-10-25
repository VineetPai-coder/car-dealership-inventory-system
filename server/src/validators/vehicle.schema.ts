/**
 * validators/vehicle.schema.ts
 *
 * Zod schemas for validating vehicle request bodies and search query params.
 * Centralising schemas here keeps routes thin and makes schemas reusable in tests.
 */

import { z } from 'zod';

const currentYear = new Date().getFullYear();

// ─── Vehicle body (create / update) ──────────────────────────────────────────

export const vehicleSchema = z.object({
  make: z
    .string({ required_error: 'Make is required.' })
    .min(1, 'Make cannot be empty.')
    .max(50, 'Make must be 50 characters or fewer.'),

  model: z
    .string({ required_error: 'Model is required.' })
    .min(1, 'Model cannot be empty.')
    .max(50, 'Model must be 50 characters or fewer.'),

  year: z
    .number({ required_error: 'Year is required.', invalid_type_error: 'Year must be a number.' })
    .int('Year must be a whole number.')
    .min(1886, 'Year must be 1886 or later (first automobile).')
    .max(currentYear + 1, `Year cannot exceed ${currentYear + 1}.`),

  category: z
    .string({ required_error: 'Category is required.' })
    .min(1, 'Category cannot be empty.')
    .max(50, 'Category must be 50 characters or fewer.'),

  color: z.string().max(30, 'Color must be 30 characters or fewer.').default('White'),

  price: z
    .number({ required_error: 'Price is required.', invalid_type_error: 'Price must be a number.' })
    .nonnegative('Price cannot be negative.'),

  quantity: z
    .number({ required_error: 'Quantity is required.', invalid_type_error: 'Quantity must be a number.' })
    .int('Quantity must be a whole number.')
    .nonnegative('Quantity cannot be negative.'),

  description: z.string().max(1000, 'Description must be 1000 characters or fewer.').default(''),
});

// ─── Restock body ─────────────────────────────────────────────────────────────

export const restockSchema = z.object({
  quantity: z
    .number({ required_error: 'Quantity is required.', invalid_type_error: 'Quantity must be a number.' })
    .int('Quantity must be a whole number.')
    .min(1, 'Restock quantity must be at least 1.'),
});

// ─── Search query params ──────────────────────────────────────────────────────

export const searchSchema = z.object({
  q:        z.string().optional(),
  make:     z.string().optional(),
  model:    z.string().optional(),
  category: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
});

// ─── Auth schemas ─────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name:     z.string().min(2, 'Name must be at least 2 characters.'),
  email:    z.string().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export const loginSchema = z.object({
  email:    z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type VehicleInput   = z.infer<typeof vehicleSchema>;
export type RestockInput   = z.infer<typeof restockSchema>;
export type SearchInput    = z.infer<typeof searchSchema>;
export type RegisterInput  = z.infer<typeof registerSchema>;
export type LoginInput     = z.infer<typeof loginSchema>;

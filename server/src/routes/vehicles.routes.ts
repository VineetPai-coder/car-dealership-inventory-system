/**
 * routes/vehicles.routes.ts
 *
 * Vehicle CRUD, search, purchase, and restock endpoints.
 * Routes are thin: parse → validate → call service → respond.
 */

import { Router } from 'express';
import type { Response } from 'express';
import {
  listVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  searchVehicles,
  purchaseVehicle,
  restockVehicle,
} from '../services/vehicle.service.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { vehicleSchema, restockSchema, searchSchema } from '../validators/vehicle.schema.js';
import { AppError, type AuthRequest } from '../types/index.js';
import db from '../db/database.js';

export const vehiclesRouter = Router();

/**
 * Sends a consistent error response for a vehicle endpoint.
 * Known application errors retain their status and message; unexpected errors
 * use a safe endpoint-specific message.
 *
 * @param res Express response used to send the error.
 * @param error Error thrown while handling the request.
 * @param fallbackMessage Safe message for unexpected failures.
 */
function sendVehicleError(res: Response, error: unknown, fallbackMessage: string): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  res.status(500).json({ error: fallbackMessage });
}

// All vehicle routes require authentication
vehiclesRouter.use(requireAuth);

/** GET /api/vehicles — list all vehicles */
vehiclesRouter.get('/', (_req, res: Response) => {
  try {
    res.json(listVehicles(db));
  } catch (err) {
    sendVehicleError(res, err, 'Failed to fetch vehicles.');
  }
});

/** GET /api/vehicles/search — search with optional filters */
vehiclesRouter.get('/search', (req, res: Response) => {
  try {
    const parsed = searchSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    res.json(searchVehicles(db, parsed.data));
  } catch (err) {
    sendVehicleError(res, err, 'Search failed.');
  }
});

/** GET /api/vehicles/:id — get a single vehicle by ID */
vehiclesRouter.get('/:id', (req, res: Response) => {
  try {
    const vehicle = getVehicleById(db, Number(req.params.id));
    res.json(vehicle);
  } catch (err) {
    sendVehicleError(res, err, 'Vehicle not found.');
  }
});

/** POST /api/vehicles — add a new vehicle (admin only, links to dealer/user) */
vehiclesRouter.post('/', requireAdmin, (req: AuthRequest, res: Response) => {
  try {
    const parsed = vehicleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const vehicle = createVehicle(db, {
      ...parsed.data,
      dealerId: parsed.data.dealerId ?? req.user?.id,
    });
    res.status(201).json(vehicle);
  } catch (err) {
    sendVehicleError(res, err, 'Failed to create vehicle.');
  }
});

/** PUT /api/vehicles/:id — update a vehicle (admin only) */
vehiclesRouter.put('/:id', requireAdmin, (req, res: Response) => {
  try {
    const parsed = vehicleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const vehicle = updateVehicle(db, Number(req.params.id), parsed.data);
    res.json(vehicle);
  } catch (err) {
    sendVehicleError(res, err, 'Failed to update vehicle.');
  }
});

/** DELETE /api/vehicles/:id — remove a vehicle (admin only) */
vehiclesRouter.delete('/:id', requireAdmin, (req, res: Response) => {
  try {
    deleteVehicle(db, Number(req.params.id));
    res.status(204).end();
  } catch (err) {
    sendVehicleError(res, err, 'Failed to delete vehicle.');
  }
});

/** POST /api/vehicles/:id/purchase — purchase a vehicle (any authenticated user) */
vehiclesRouter.post('/:id/purchase', (req: AuthRequest, res: Response) => {
  try {
    const result = purchaseVehicle(db, Number(req.params.id), req.user!.id);
    res.status(201).json(result);
  } catch (err) {
    sendVehicleError(res, err, 'Purchase failed.');
  }
});

/** POST /api/vehicles/:id/restock — restock a vehicle (admin only) */
vehiclesRouter.post('/:id/restock', requireAdmin, (req, res: Response) => {
  try {
    const parsed = restockSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const vehicle = restockVehicle(db, Number(req.params.id), parsed.data.quantity);
    res.json(vehicle);
  } catch (err) {
    sendVehicleError(res, err, 'Restock failed.');
  }
});

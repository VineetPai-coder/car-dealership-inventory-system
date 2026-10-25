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
  createVehicle,
  updateVehicle,
  deleteVehicle,
  searchVehicles,
  purchaseVehicle,
  restockVehicle,
} from '../services/vehicle.service.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { vehicleSchema, restockSchema, searchSchema } from '../validators/vehicle.schema.js';
import type { AuthRequest } from '../types/index.js';
import db from '../db/database.js';

export const vehiclesRouter = Router();

// All vehicle routes require authentication
vehiclesRouter.use(requireAuth);

/** GET /api/vehicles — list all vehicles */
vehiclesRouter.get('/', (_req, res: Response) => {
  try {
    res.json(listVehicles(db));
  } catch (err) {
    const e = err as any;
    res.status(e.statusCode ?? 500).json({ error: e.message ?? 'Failed to fetch vehicles.' });
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
    const e = err as any;
    res.status(e.statusCode ?? 500).json({ error: e.message ?? 'Search failed.' });
  }
});

/** POST /api/vehicles — add a new vehicle (admin only) */
vehiclesRouter.post('/', requireAdmin, (req, res: Response) => {
  try {
    const parsed = vehicleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message });
      return;
    }
    const vehicle = createVehicle(db, parsed.data);
    res.status(201).json(vehicle);
  } catch (err) {
    const e = err as any;
    res.status(e.statusCode ?? 500).json({ error: e.message ?? 'Failed to create vehicle.' });
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
    const e = err as any;
    res.status(e.statusCode ?? 500).json({ error: e.message ?? 'Failed to update vehicle.' });
  }
});

/** DELETE /api/vehicles/:id — remove a vehicle (admin only) */
vehiclesRouter.delete('/:id', requireAdmin, (req, res: Response) => {
  try {
    deleteVehicle(db, Number(req.params.id));
    res.status(204).end();
  } catch (err) {
    const e = err as any;
    res.status(e.statusCode ?? 500).json({ error: e.message ?? 'Failed to delete vehicle.' });
  }
});

/** POST /api/vehicles/:id/purchase — purchase a vehicle (any authenticated user) */
vehiclesRouter.post('/:id/purchase', (req: AuthRequest, res: Response) => {
  try {
    const result = purchaseVehicle(db, Number(req.params.id), req.user!.id);
    res.status(201).json(result);
  } catch (err) {
    const e = err as any;
    res.status(e.statusCode ?? 500).json({ error: e.message ?? 'Purchase failed.' });
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
    const e = err as any;
    res.status(e.statusCode ?? 500).json({ error: e.message ?? 'Restock failed.' });
  }
});

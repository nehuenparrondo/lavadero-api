import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { requireOwnership } from '../../middlewares/requireOwnership.js';
import { validate } from '../../middlewares/validate.js';
import { endpoint, paramId } from '../../utils/http.js';
import { findVehicle } from './vehicles.repository.js';
import { vehicleSchema, vehiclePatchSchema } from './vehicles.schema.js';
import * as c from './vehicles.controller.js';
/** Vehículos: clientes propietarios y administración; empleados excluidos. */
export function createVehiclesRoutes() {
  const r = Router();
  r.use(authenticate, requireRole('client', 'admin'));
  r.get('/', endpoint(c.list));
  r.post('/', validate(vehicleSchema), endpoint(c.create, 201));
  r.use(
    '/:id',
    requireOwnership(async (req) => (await findVehicle(paramId(req)))?.ownerId),
  );
  r.get('/:id', endpoint(c.get));
  r.patch('/:id', validate(vehiclePatchSchema), endpoint(c.edit));
  r.delete('/:id', endpoint(c.remove));
  return r;
}

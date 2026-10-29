import type { Request } from 'express';
import type { z } from 'zod';
import { actor, paramId } from '../../utils/http.js';
import { paginationSchema } from '../../utils/pagination.js';
import * as service from './vehicles.service.js';
import { listVehicles } from './vehicles.repository.js';
import type { vehicleSchema, vehiclePatchSchema } from './vehicles.schema.js';
/** Lista visibles para el actor, con búsqueda/paginación. */
export function list(r: Request) {
  const q = paginationSchema.parse(r.query);
  const a = actor(r);
  return listVehicles(a.role === 'admin' ? undefined : a.id, q.page, q.limit, q.search);
}
/** Consulta por ID con propiedad validada. */
export function get(r: Request) {
  return service.getVehicle(actor(r), paramId(r));
}
/** Crea vehículo. */
export function create(r: Request) {
  return service.createVehicle(actor(r), r.body as z.infer<typeof vehicleSchema>);
}
/** Edita vehículo. */
export function edit(r: Request) {
  return service.editVehicle(
    actor(r),
    paramId(r),
    r.body as z.infer<typeof vehiclePatchSchema>,
  );
}
/** Elimina vehículo lógicamente. */
export function remove(r: Request) {
  return service.deleteVehicle(actor(r), paramId(r));
}

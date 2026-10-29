import type { Request } from 'express';
import type { z } from 'zod';
import { actor, paramId } from '../../utils/http.js';
import * as s from './vehicleTypes.service.js';
import type { vehicleTypeSchema } from './vehicleTypes.schema.js';
/** Catálogo de tipos. */
export function list(r: Request) {
  return s.listTypes(actor(r).role === 'admin');
}
/** Alta administrativa. */
export function create(r: Request) {
  return s.createType(r.body as z.infer<typeof vehicleTypeSchema>);
}
/** Edición administrativa. */
export function edit(r: Request) {
  return s.editType(paramId(r), r.body as z.infer<typeof vehicleTypeSchema>);
}
/** Baja administrativa. */
export function remove(r: Request) {
  return s.deleteType(paramId(r));
}

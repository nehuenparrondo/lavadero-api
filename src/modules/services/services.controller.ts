import type { Request } from 'express';
import type { z } from 'zod';
import { actor, paramId } from '../../utils/http.js';
import * as s from './services.service.js';
import type { serviceSchema, servicePatchSchema, priceSchema } from './services.schema.js';
/** Catálogo según rol. */
export function list(r: Request) {
  return s.catalog(actor(r).role === 'admin');
}
/** Consulta individual de servicio y tarifas. */
export function get(r: Request) {
  return s.getService(paramId(r), actor(r).role === 'admin');
}
/** Alta de servicio. */
export function create(r: Request) {
  return s.createService(r.body as z.infer<typeof serviceSchema>);
}
/** Edición administrativa. */
export function edit(r: Request) {
  return s.editService(paramId(r), r.body as z.infer<typeof servicePatchSchema>);
}
/** Baja lógica. */
export function remove(r: Request) {
  return s.deleteService(paramId(r));
}
/** Tarifa por tipo. */
export function price(r: Request) {
  return s.setPrice(
    paramId(r),
    paramId(r, 'typeId'),
    (r.body as z.infer<typeof priceSchema>).priceCents,
  );
}

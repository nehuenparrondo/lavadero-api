import type { Request } from 'express';
import type { z } from 'zod';
import { actor, paramId } from '../../utils/http.js';
import type { vehicleTypeSchema } from './vehicleTypes.schema.js';
import * as s from './vehicleTypes.service.js';
/** Catálogo de tipos.
 * @param r - Petición HTTP; los valores se validan antes de ejecutar el servicio.
 * @returns `Promise<{ isActive: boolean; constructor: { name: "RowDataPacket"; }; }[]>`, según el contrato de la operación.
 */
export function list(r: Request) {
  return s.listTypes(actor(r).role === 'admin');
}
/** Alta administrativa.
 * @param r - Petición HTTP; los valores se validan antes de ejecutar el servicio.
 * @returns `Promise<{ code: string; name: string; isActive: boolean; id: string; }>`, según el contrato de la operación.
 */
export function create(r: Request) {
  return s.createType(r.body as z.infer<typeof vehicleTypeSchema>);
}
/** Edición administrativa.
 * @param r - Petición HTTP; los valores se validan antes de ejecutar el servicio.
 * @returns `Promise<{ code: string; name: string; isActive: boolean; id: string; }>`, según el contrato de la operación.
 */
export function edit(r: Request) {
  return s.editType(paramId(r), r.body as z.infer<typeof vehicleTypeSchema>);
}
/** Baja administrativa.
 * @param r - Petición HTTP; los valores se validan antes de ejecutar el servicio.
 * @returns `Promise<{ deleted: boolean; }>`, según el contrato de la operación.
 */
export function remove(r: Request) {
  return s.deleteType(paramId(r));
}

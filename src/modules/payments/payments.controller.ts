import type { Request } from 'express';
import type { z } from 'zod';
import { actor, paramId } from '../../utils/http.js';
import type { paymentSchema } from './payments.schema.js';
import { getPayments, recordPayment } from './payments.service.js';
/** Cobros del turno autorizado. */
export function list(r: Request) {
  return getPayments(actor(r), paramId(r));
}
/** Registro idempotente de cobro. */
export function create(r: Request) {
  return recordPayment(actor(r), paramId(r), r.body as z.infer<typeof paymentSchema>);
}

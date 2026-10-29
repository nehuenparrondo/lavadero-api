import type { Request } from 'express';
import { actor } from '../../utils/http.js';
import { reportSchema } from './reports.schema.js';
import { businessReport, personalReport } from './reports.service.js';
/** Reporte administrativo. */
export function business(r: Request) {
  return businessReport(reportSchema.parse(r.query));
}
/** Resumen propio de empleado. */
export function personal(r: Request) {
  return personalReport(actor(r).id, reportSchema.parse(r.query));
}

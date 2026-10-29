import type { Request } from 'express';
import type { z } from 'zod';
import { actor, paramId } from '../../utils/http.js';
import * as service from './appointments.service.js';
import { createAppointment } from './booking.service.js';
import { availability } from './availability.service.js';
import { changeStatus, assignEmployee } from './mutation.service.js';
import { appointmentQuerySchema, availabilitySchema } from './appointments.schema.js';
import type {
  appointmentSchema,
  statusSchema,
  assignmentSchema,
  cancelSchema,
  noteSchema,
} from './appointments.schema.js';
/** Lista por rol y filtros. */
export function list(r: Request) {
  return service.listAppointments(actor(r), appointmentQuerySchema.parse(r.query));
}
/** Detalle autorizado. */
export function get(r: Request) {
  return service.getAppointment(actor(r), paramId(r));
}
/** Cotización/horarios. */
export function slots(r: Request) {
  return availability(actor(r), availabilitySchema.parse(r.query));
}
/** Alta de turno. */
export function create(r: Request) {
  return createAppointment(actor(r), r.body as z.infer<typeof appointmentSchema>);
}
/** Cambio de estado por empleado o admin. */
export function status(r: Request) {
  return changeStatus(actor(r), paramId(r), (r.body as z.infer<typeof statusSchema>).status);
}
/** Cancelación del cliente/admin. */
export function cancel(r: Request) {
  return changeStatus(
    actor(r),
    paramId(r),
    'cancelled',
    (r.body as z.infer<typeof cancelSchema>).reason,
  );
}
/** Asignación administrativa. */
export function assign(r: Request) {
  return assignEmployee(
    actor(r),
    paramId(r),
    (r.body as z.infer<typeof assignmentSchema>).employeeId,
  );
}
/** Observación de trabajo. */
export function note(r: Request) {
  return service.addNote(actor(r), paramId(r), (r.body as z.infer<typeof noteSchema>).body);
}
/** Comprobante histórico. */
export function receipt(r: Request) {
  return service.receipt(actor(r), paramId(r));
}

import { z } from 'zod';
import { paginationSchema } from '../../utils/pagination.js';
const id = z.string().regex(/^[1-9]\d{0,18}$/u);
/** Valores únicos y acotados evitan consultas y totales ambiguos. */
export const serviceIdsSchema = z
  .array(id)
  .min(1)
  .max(10)
  .refine((v) => new Set(v).size === v.length, 'No repitas servicios.');
/** Alta de reserva: fechas ISO con offset, convertidas a UTC. */
export const appointmentSchema = z
  .object({
    vehicleId: id,
    serviceIds: serviceIdsSchema,
    startsAt: z.string().datetime({ offset: true }),
    clientId: id.optional(),
  })
  .strict();
/** Búsqueda y filtros; servicio limita visibilidad según rol. */
export const appointmentQuerySchema = paginationSchema.extend({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u)
    .optional(),
  status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']).optional(),
  clientId: id.optional(),
  employeeId: id.optional(),
  history: z.enum(['true', 'false']).optional(),
});
/** Selección de disponibilidad sin crear reservas. */
export const availabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  vehicleId: id,
  serviceIds: z.preprocess(
    (v) => (typeof v === 'string' ? v.split(',') : v),
    serviceIdsSchema,
  ),
});
/** Estados admitidos; la transición se decide exclusivamente en service. */
export const statusSchema = z
  .object({
    status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']),
  })
  .strict();
/** Solo un administrador puede elegir empleado. */
export const assignmentSchema = z.object({ employeeId: id }).strict();
/** Cancelación con motivo opcional. */
export const cancelSchema = z
  .object({ reason: z.string().trim().max(500).default('') })
  .strict();
/** Observación atribuida al actor, no a un autor elegido en el body. */
export const noteSchema = z.object({ body: z.string().trim().min(1).max(2000) }).strict();

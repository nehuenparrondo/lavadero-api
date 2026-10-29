import type { z } from 'zod';
import type { Actor } from '../../types/domain.js';
import { DateTime } from 'luxon';
import { AppError } from '../../errors/AppError.js';
import { readSettings } from '../settings/settings.repository.js';
import * as repo from './appointments.repository.js';
import { assertAppointmentAccess, presentAppointment } from './appointments.access.js';
import type { appointmentQuerySchema } from './appointments.schema.js';

/** Lista exclusivamente propios/asignados y admite filtros administrativos sin ampliar acceso. */
export async function listAppointments(
  actor: Actor,
  input: z.infer<typeof appointmentQuerySchema>,
) {
  const conditions = ['1=1'];
  const values: unknown[] = [];
  if (actor.role === 'client') {
    conditions.push('a.client_id=?');
    values.push(actor.id);
  }
  if (actor.role === 'employee') {
    conditions.push('a.employee_id=?');
    values.push(actor.id);
  }
  if (input.status) {
    conditions.push('s.code=?');
    values.push(input.status);
  }
  if (input.clientId) {
    conditions.push('a.client_id=?');
    values.push(input.clientId);
  }
  if (input.employeeId) {
    conditions.push('a.employee_id=?');
    values.push(input.employeeId);
  }
  if (input.history) {
    conditions.push(
      input.history === 'true'
        ? "s.code IN ('completed','cancelled')"
        : "s.code IN ('pending','confirmed','in_progress')",
    );
  }
  if (input.date) {
    const settings = await readSettings();
    const day = DateTime.fromISO(input.date, { zone: settings?.timeZone ?? 'UTC' });
    if (!day.isValid) throw new AppError(400, 'INVALID_DATE', 'Fecha inválida.');
    conditions.push('a.starts_at>=? AND a.starts_at<?');
    values.push(
      day.toUTC().toSQL({ includeOffset: false }),
      day.plus({ days: 1 }).toUTC().toSQL({ includeOffset: false }),
    );
  }
  const result = await repo.listAppointments(
    ' WHERE ' + conditions.join(' AND '),
    values,
    input.page,
    input.limit,
    input.history === 'false' || input.date ? 'ASC' : 'DESC',
  );
  return { ...result, items: result.items.map((v) => presentAppointment(v, actor)) };
}
/** Detalle autorizado con servicios/observaciones; empleado recibe solo datos operativos. */
export async function getAppointment(actor: Actor, id: string) {
  const appointment = await repo.findAppointment(id);
  assertAppointmentAccess(actor, appointment);
  const [items, notes] = await Promise.all([repo.readItems(id), repo.readNotes(id)]);
  return {
    ...presentAppointment(appointment, actor),
    services:
      actor.role === 'employee'
        ? items.map((i) => ({
            serviceId: i.serviceId,
            name: i.name,
            durationMinutes: i.durationMinutes,
          }))
        : items,
    notes,
  };
}
/** Registra observación solo en turno asignado (o admin). */
export async function addNote(actor: Actor, id: string, body: string) {
  const appointment = await repo.findAppointment(id);
  assertAppointmentAccess(actor, appointment);
  await repo.insertNote(id, actor.id, body);
  return { created: true };
}
/** Comprobante de trabajo finalizado, visible al dueño y admin. No equivale a una factura fiscal. */
export async function receipt(actor: Actor, id: string) {
  const appointment = await repo.findAppointment(id);
  assertAppointmentAccess(actor, appointment);
  if (appointment.status !== 'completed')
    throw new AppError(
      409,
      'NOT_COMPLETED',
      'El comprobante está disponible al finalizar el trabajo.',
    );
  return {
    ...(await getAppointment(actor, id)),
    receiptNumber: `LAV-${id}`,
    issuedAt: new Date().toISOString(),
    fiscalInvoice: false,
  };
}

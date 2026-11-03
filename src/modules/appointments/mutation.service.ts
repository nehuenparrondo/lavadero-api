import { AppError } from '../../errors/AppError.js';
import type { Actor } from '../../types/domain.js';
import type { Executor } from '../../utils/db.js';
import { transaction } from '../../utils/transaction.js';
import { readSettings } from '../settings/settings.repository.js';
import { findUser } from '../users/users.repository.js';
import { assertAppointmentAccess } from './appointments.access.js';
import * as repo from './appointments.repository.js';
import type { Appointment, AppointmentStatus } from './appointments.types.js';
import { bookingIntervals } from './intervals.js';
import { canFit, utcMillis } from './schedule.js';
import { assertTransition } from './transitions.js';
import { assertTeamCapacity } from './teamCapacity.js';

/** Valida empleado activo y evita doble asignación al reactivar/asignar un turno. */
async function assertEmployee(
  appointment: Appointment,
  employeeId: string,
  capacity: number,
  executor: Executor,
) {
  const user = await findUser(employeeId, executor);
  if (!user || user.role !== 'employee' || !user.isActive || user.deletedAt)
    throw new AppError(400, 'INVALID_EMPLOYEE', 'Seleccioná un empleado activo.');
  const existing = await repo.overlapping(
    appointment.startsAt,
    appointment.endsAt,
    appointment.id,
    executor,
  );
  const intervals = bookingIntervals(existing);
  if (
    !canFit(
      utcMillis(appointment.startsAt),
      utcMillis(appointment.endsAt),
      capacity,
      intervals,
      employeeId,
      appointment.vehicleId,
    )
  )
    throw new AppError(
      409,
      'EMPLOYEE_BUSY',
      'El empleado o la capacidad no están disponibles.',
    );
}
/** Cambia estado con permisos, ownership, ventana de cancelación y bloqueo de agenda.
 * @param actor - Actor autenticado por el middleware; determina rol y propiedad.
 * @param id - Identificador del recurso dentro del proyecto actual.
 * @param status - Estado solicitado; el servicio comprueba si la transición está permitida.
 * @param reason - Motivo de cancelación conservado en el historial.
 * @returns `Promise<{ updated: boolean; status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled"; }>`.
 * @throws Error - Cuando no se cumple una precondición indicada en esta operación.
 */
export async function changeStatus(
  actor: Actor,
  id: string,
  status: AppointmentStatus,
  reason = '',
) {
  return transaction(async (connection) => {
    const settings = await readSettings(connection, true);
    if (!settings) throw new AppError(503, 'SETTINGS_MISSING', 'Falta configurar el negocio.');
    const appointment = await repo.findAppointment(id, connection, true);
    assertAppointmentAccess(actor, appointment);
    assertTransition(appointment.status, status, actor.role);
    assertCancellationNotice(actor, appointment, settings.cancellationNoticeMinutes);
    if (['confirmed', 'in_progress', 'completed'].includes(status)) {
      await assertTeamCapacity(appointment, settings.simultaneousCapacity, connection);
      if (status === 'in_progress' && actor.role === 'employee')
        await repo.setEmployee(id, actor.id, connection);
    }
    await repo.setStatus(id, status, actor.id, connection);
    if (status === 'cancelled')
      await repo.recordCancellation(id, actor.id, reason, connection);
    return { updated: true, status };
  });
}
/** Asigna/reasigna sin cambiar estado; confirmar es una acción administrativa separada.
 * @param actor - Actor autenticado por el middleware; determina rol y propiedad.
 * @param id - Identificador del recurso dentro del proyecto actual.
 * @param employeeId - Empleado activo que se asigna o consulta.
 * @returns `Promise<{ assigned: boolean; }>`.
 * @throws Error - Cuando no se cumple una precondición indicada en esta operación.
 */
export async function assignEmployee(actor: Actor, id: string, employeeId: string) {
  return transaction(async (connection) => {
    const settings = await readSettings(connection, true);
    const appointment = await repo.findAppointment(id, connection, true);
    assertAppointmentAccess(actor, appointment);
    if (!settings) throw new AppError(503, 'SETTINGS_MISSING', 'Falta configurar el negocio.');
    if (['completed', 'cancelled'].includes(appointment.status))
      throw new AppError(409, 'APPOINTMENT_CLOSED', 'No se puede reasignar un turno cerrado.');
    await assertEmployee(appointment, employeeId, settings.simultaneousCapacity, connection);
    await repo.setEmployee(id, employeeId, connection);
    return { assigned: true };
  });
}

/** Admin conserva cancelación de emergencia; el cliente respeta la anticipación configurada. */
function assertCancellationNotice(actor: Actor, appointment: Appointment, notice: number) {
  if (
    actor.role === 'client' &&
    utcMillis(appointment.startsAt) - Date.now() <= notice * 60000
  )
    throw new AppError(
      409,
      'CANCELLATION_WINDOW',
      'Ya pasó el plazo para cancelar desde la app.',
    );
}

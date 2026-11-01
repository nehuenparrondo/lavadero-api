import { NotFoundError } from '../../errors/NotFoundError.js';
import type { Actor } from '../../types/domain.js';
import type { Appointment } from './appointments.types.js';
import { isoTime } from './schedule.js';
/** Oculta la existencia de turnos ajenos al actor.
 * @param actor - Actor autenticado por el middleware; determina rol y propiedad.
 * @param appointment - Turno autorizado que conserva datos históricos del contrato.
 * @returns `void`.
 * @throws Error - Cuando no se cumple una precondición indicada en esta operación.
 */
export function assertAppointmentAccess(
  actor: Actor,
  appointment: Appointment | undefined,
): asserts appointment is Appointment {
  if (
    !appointment ||
    (actor.role === 'client' && appointment.clientId !== actor.id) ||
    (actor.role === 'employee' && appointment.employeeId !== actor.id)
  )
    throw new NotFoundError();
}
/** Proyecta el turno por actor sin serializar la fila interna completa.
 * @param v Turno interno con claves de cuenta e importes históricos.
 * @param actor Identidad vigente que determina los campos autorizados.
 * @returns Datos operativos; el empleado recibe importes solo con canRecordPayments.
 */
export function presentAppointment(v: Appointment, actor: Actor) {
  const common = operationalAppointment(v);
  return actor.role === 'employee'
    ? {
        ...common,
        ...(actor.canRecordPayments
          ? {
              totalCents: Number(v.totalCents),
              paidCents: Number(v.paidCents),
              currencyCode: v.currencyCode,
            }
          : {}),
      }
    : {
        ...common,
        clientId: v.clientId,
        vehicleId: v.vehicleId,
        employeeId: v.employeeId,
        totalCents: Number(v.totalCents),
        paidCents: Number(v.paidCents),
        currencyCode: v.currencyCode,
      };
}

/** Datos mínimos de operación; no contiene identidad de cuenta ni información financiera. */
function operationalAppointment(v: Appointment) {
  return {
    id: v.id,
    status: v.status,
    startsAt: isoTime(v.startsAt),
    endsAt: isoTime(v.endsAt),
    plate: v.plate,
    brand: v.brand,
    model: v.model,
    color: v.color,
    serviceSummary: v.serviceSummary,
    clientName: v.clientName,
    clientPhone: v.clientPhone,
    employeeName: v.employeeName,
    version: v.version,
  };
}

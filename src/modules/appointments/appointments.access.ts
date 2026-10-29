import type { Actor } from '../../types/domain.js';
import type { Appointment } from './appointments.types.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { isoTime } from './schedule.js';
/** Oculta la existencia de turnos ajenos al actor. */
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
/** Proyección mínima de datos: un empleado no recibe importes ni datos de cuenta del cliente. */
export function presentAppointment(v: Appointment, actor: Actor) {
  const common = {
    id: v.id,
    status: v.status,
    startsAt: isoTime(v.startsAt),
    endsAt: isoTime(v.endsAt),
    plate: v.plate,
    brand: v.brand,
    model: v.model,
    color: v.color,
    clientName: v.clientName,
    clientPhone: v.clientPhone,
    employeeName: v.employeeName,
    version: v.version,
  };
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

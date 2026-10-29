import type { z } from 'zod';
import type { Actor } from '../../types/domain.js';
import { transaction } from '../../utils/transaction.js';
import { findAppointment } from '../appointments/appointments.repository.js';
import { assertAppointmentAccess } from '../appointments/appointments.access.js';
import { AppError } from '../../errors/AppError.js';
import type { paymentSchema } from './payments.schema.js';
import * as repo from './payments.repository.js';
/** Lista cobros propios o administrados; empleados solo pueden registrar cuando están habilitados. */
export async function getPayments(actor: Actor, id: string) {
  const a = await findAppointment(id);
  assertAppointmentAccess(actor, a);
  return repo.listPayments(id);
}
/** Registra saldo sin cobros duplicados ni sobrepago, incluso con solicitudes concurrentes. */
export async function recordPayment(
  actor: Actor,
  id: string,
  input: z.infer<typeof paymentSchema>,
) {
  return transaction(async (connection) => {
    const appointment = await findAppointment(id, connection, true);
    assertAppointmentAccess(actor, appointment);
    if (actor.role === 'employee' && !actor.canRecordPayments)
      throw new AppError(
        403,
        'PAYMENT_PERMISSION',
        'No estás habilitado para registrar cobros.',
      );
    const previous = await repo.findPayment(input.idempotencyKey, connection);
    if (previous) {
      if (
        previous.appointmentId !== id ||
        previous.amountCents !== input.amountCents ||
        previous.method !== input.method ||
        (previous.reference ?? null) !== (input.reference ?? null)
      )
        throw new AppError(
          409,
          'IDEMPOTENCY_CONFLICT',
          'La clave de pago ya se usó con otros datos.',
        );
      return { recorded: true, replayed: true };
    }
    if (!['in_progress', 'completed'].includes(appointment.status))
      throw new AppError(
        409,
        'PAYMENT_STATE',
        'Registrá el cobro cuando el trabajo esté en proceso o finalizado.',
      );
    if (input.amountCents > Number(appointment.totalCents) - Number(appointment.paidCents))
      throw new AppError(409, 'OVERPAYMENT', 'El importe supera el saldo pendiente.');
    const paymentId = await repo.insertPayment(id, actor.id, input, connection);
    return { recorded: true, id: paymentId, replayed: false };
  });
}

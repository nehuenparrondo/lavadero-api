import type { z } from 'zod';
import { AppError } from '../../errors/AppError.js';
import type { Actor } from '../../types/domain.js';
import type { Executor } from '../../utils/db.js';
import { transaction } from '../../utils/transaction.js';
import { readSettings } from '../settings/settings.repository.js';
import { findUser } from '../users/users.repository.js';
import { presentAppointment } from './appointments.access.js';
import * as repo from './appointments.repository.js';
import type { appointmentSchema } from './appointments.schema.js';
import type { QuoteItem } from './appointments.types.js';
import { quote } from './availability.service.js';
import { assertBookingSlot } from './bookingSlot.service.js';
import { sqlTime } from './schedule.js';

/** Reserva atómica: serializa agenda, recalcula precio y vuelve a comprobar capacidad.
 * @param actor - Actor autenticado por el middleware; determina rol y propiedad.
 * @param input - Entrada validada por el esquema del caso de uso.
 * @returns Promesa de un objeto con totalCents, paidCents, currencyCode, id, status, startsAt, endsAt, plate, brand, model.
 * @throws Error - Cuando no se cumple una precondición indicada en esta operación.
 */
export async function createAppointment(
  actor: Actor,
  input: z.infer<typeof appointmentSchema>,
) {
  return transaction(async (connection) => {
    const settings = await readSettings(connection, true);
    if (!settings) throw new AppError(503, 'SETTINGS_MISSING', 'Falta configurar el negocio.');
    const quoted = await quote(actor, input.vehicleId, input.serviceIds, connection);
    const clientId = await validateClient(
      actor,
      input.clientId,
      quoted.vehicle.ownerId,
      connection,
    );
    const { start, end } = await assertBookingSlot(
      input.startsAt,
      quoted.durationMinutes,
      input.vehicleId,
      settings,
      connection,
    );
    return persistBooking(
      actor,
      input.vehicleId,
      clientId,
      start,
      end,
      settings.currencyCode,
      quoted.items,
      connection,
    );
  });
}

/** Comprueba titular activo y correspondencia de la reserva bajo el lock común. */
async function validateClient(
  actor: Actor,
  requestedId: string | undefined,
  ownerId: string,
  connection: Executor,
) {
  const clientId = requestedId ?? ownerId;
  const client = await findUser(clientId, connection);
  if (
    !client ||
    !client.isActive ||
    client.deletedAt ||
    client.role !== 'client' ||
    clientId !== ownerId ||
    (actor.role === 'client' && clientId !== actor.id)
  )
    throw new AppError(
      403,
      'INVALID_CLIENT',
      'La reserva debe corresponder al titular del vehículo.',
    );
  return clientId;
}

/** Persiste el contrato histórico y el primer estado en la misma transacción. */
async function persistBooking(
  actor: Actor,
  vehicleId: string,
  clientId: string,
  start: number,
  end: number,
  currencyCode: string,
  items: QuoteItem[],
  connection: Executor,
) {
  const id = await repo.insertAppointment(
    {
      clientId,
      vehicleId: vehicleId,
      startsAt: sqlTime(start),
      endsAt: sqlTime(end),
      createdById: actor.id,
      currencyCode: currencyCode,
    },
    connection,
  );
  await repo.insertItems(id, items, connection);
  await repo.setStatus(id, 'pending', actor.id, connection);
  return presentAppointment((await repo.findAppointment(id, connection))!, actor);
}

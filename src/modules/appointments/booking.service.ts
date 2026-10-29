import type { z } from 'zod';
import { DateTime } from 'luxon';
import type { Actor } from '../../types/domain.js';
import { transaction } from '../../utils/transaction.js';
import { AppError } from '../../errors/AppError.js';
import { readSettings, readHours } from '../settings/settings.repository.js';
import { findUser } from '../users/users.repository.js';
import { quote } from './availability.service.js';
import { assertWorkingTime, sqlTime, utcMillis, canFit } from './schedule.js';
import * as repo from './appointments.repository.js';
import { presentAppointment } from './appointments.access.js';
import type { appointmentSchema } from './appointments.schema.js';

/** Reserva atómica: serializa agenda, recalcula precio y vuelve a comprobar capacidad. */
export async function createAppointment(
  actor: Actor,
  input: z.infer<typeof appointmentSchema>,
) {
  return transaction(async (connection) => {
    const settings = await readSettings(connection, true);
    if (!settings) throw new AppError(503, 'SETTINGS_MISSING', 'Falta configurar el negocio.');
    const quoted = await quote(actor, input.vehicleId, input.serviceIds, connection);
    const clientId = input.clientId ?? quoted.vehicle.ownerId;
    const client = await findUser(clientId, connection);
    if (
      !client ||
      !client.isActive ||
      client.deletedAt ||
      client.role !== 'client' ||
      clientId !== quoted.vehicle.ownerId ||
      (actor.role === 'client' && clientId !== actor.id)
    )
      throw new AppError(
        403,
        'INVALID_CLIENT',
        'La reserva debe corresponder al titular del vehículo.',
      );
    const start = DateTime.fromISO(input.startsAt, { setZone: true }).toMillis();
    const end = start + quoted.durationMinutes * 60000;
    assertWorkingTime(start, end, settings, await readHours(connection));
    const existing = await repo.overlapping(
      sqlTime(start),
      sqlTime(end),
      undefined,
      connection,
    );
    const intervals = existing.map((v) => ({
      start: utcMillis(v.startsAt),
      end: utcMillis(v.endsAt),
      employeeId: v.employeeId as string | null,
      vehicleId: String(v.vehicleId),
    }));
    if (!canFit(start, end, settings.simultaneousCapacity, intervals, null, input.vehicleId))
      throw new AppError(
        409,
        'SLOT_UNAVAILABLE',
        'Ese horario acaba de ocuparse. Elegí otro.',
      );
    const id = await repo.insertAppointment(
      {
        clientId,
        vehicleId: input.vehicleId,
        startsAt: sqlTime(start),
        endsAt: sqlTime(end),
        createdById: actor.id,
        currencyCode: settings.currencyCode,
      },
      connection,
    );
    await repo.insertItems(id, quoted.items, connection);
    await repo.setStatus(id, 'pending', actor.id, connection);
    return presentAppointment((await repo.findAppointment(id, connection))!, actor);
  });
}

import type { z } from 'zod';
import { DateTime } from 'luxon';
import type { Actor } from '../../types/domain.js';
import type { Executor } from '../../utils/db.js';
import { AppError } from '../../errors/AppError.js';
import { findVehicle } from '../vehicles/vehicles.repository.js';
import { readSettings, readHours } from '../settings/settings.repository.js';
import { quoteServices, overlapping } from './appointments.repository.js';
import { businessWindow, canFit, sqlTime, utcMillis } from './schedule.js';
import type { availabilitySchema } from './appointments.schema.js';
import { NotFoundError } from '../../errors/NotFoundError.js';

/** Cotiza servicios activos para un vehículo visible y habilitado. */
export async function quote(
  current: Actor,
  vehicleId: string,
  ids: string[],
  executor?: Executor,
) {
  const vehicle = await findVehicle(vehicleId, executor);
  if (
    !vehicle ||
    vehicle.deletedAt ||
    (current.role === 'client' && vehicle.ownerId !== current.id)
  )
    throw new NotFoundError();
  const items = await quoteServices(ids, vehicle.vehicleTypeId, executor);
  if (items.length !== ids.length)
    throw new AppError(
      400,
      'INVALID_SERVICES',
      'Algún servicio no está activo o no tiene precio para tu vehículo.',
    );
  return {
    vehicle,
    items,
    totalCents: items.reduce((sum, i) => sum + i.priceCents, 0),
    durationMinutes: items.reduce((sum, i) => sum + i.durationMinutes, 0),
  };
}
/** Genera opciones de inicio respetando duración completa, capacidad y vehículo. */
export async function availability(current: Actor, input: z.infer<typeof availabilitySchema>) {
  const settings = await readSettings();
  if (!settings)
    throw new AppError(503, 'SETTINGS_MISSING', 'El negocio requiere configuración.');
  const quoted = await quote(current, input.vehicleId, input.serviceIds);
  const hours = await readHours();
  const window = businessWindow(input.date, settings, hours);
  if (!window)
    return {
      ...quoted,
      vehicle: undefined,
      items: quoted.items,
      slots: [],
      currencyCode: settings.currencyCode,
    };
  const booked = await overlapping(sqlTime(window.open), sqlTime(window.close), undefined);
  const intervals = booked.map((v) => ({
    start: utcMillis(v.startsAt),
    end: utcMillis(v.endsAt),
    employeeId: v.employeeId as string | null,
    vehicleId: String(v.vehicleId),
  }));
  const slots: string[] = [];
  const duration = quoted.durationMinutes * 60000;
  for (
    let start = window.open;
    start + duration <= window.close;
    start += settings.slotStepMinutes * 60000
  ) {
    if (
      start > Date.now() &&
      canFit(
        start,
        start + duration,
        settings.simultaneousCapacity,
        intervals,
        null,
        input.vehicleId,
      )
    )
      slots.push(DateTime.fromMillis(start, { zone: 'utc' }).toISO()!);
  }
  return {
    items: quoted.items,
    totalCents: quoted.totalCents,
    durationMinutes: quoted.durationMinutes,
    slots,
    currencyCode: settings.currencyCode,
  };
}

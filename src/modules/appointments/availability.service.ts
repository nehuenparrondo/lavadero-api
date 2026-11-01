import { DateTime } from 'luxon';
import type { z } from 'zod';
import { AppError } from '../../errors/AppError.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import type { Actor } from '../../types/domain.js';
import type { Executor } from '../../utils/db.js';
import { readHours, readSettings } from '../settings/settings.repository.js';
import { findVehicle } from '../vehicles/vehicles.repository.js';
import { overlapping, quoteServices } from './appointments.repository.js';
import type { availabilitySchema } from './appointments.schema.js';
import { bookingIntervals } from './intervals.js';
import { businessWindow, canFit, sqlTime } from './schedule.js';

/** Cotiza servicios activos para un vehículo visible y habilitado.
 * @param current - Identidad o entidad actual usada para conservar sus invariantes.
 * @param vehicleId - Identificador del vehículo cuyo titular y disponibilidad se verifican.
 * @param ids - Identificadores de servicios seleccionados, únicos y validados.
 * @param executor - Ejecutor SQL; permite participar en la transacción del llamador.
 * @returns `Promise<{ vehicle: import("../vehicles/vehicles.repository.js").Vehicle; items: import("./appointments.types.js").QuoteItem[]; totalCents: number; durationMinutes: number; }>`, según el contrato de la operación.
 * @throws Error - Cuando no se cumple una precondición indicada en esta operación.
 */
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
/** Genera opciones de inicio respetando duración completa, capacidad y vehículo.
 * @param current - Identidad o entidad actual usada para conservar sus invariantes.
 * @param input - Entrada validada por el esquema del caso de uso.
 * @returns `Promise<{ items: import("./appointments.types.js").QuoteItem[]; totalCents: number; durationMinutes: number; slots: string[]; currencyCode: string; }>`, según el contrato de la operación.
 * @throws Error - Cuando no se cumple una precondición indicada en esta operación.
 */
export async function availability(current: Actor, input: z.infer<typeof availabilitySchema>) {
  const settings = await readSettings();
  if (!settings)
    throw new AppError(503, 'SETTINGS_MISSING', 'El negocio requiere configuración.');
  const quoted = await quote(current, input.vehicleId, input.serviceIds);
  const hours = await readHours();
  const window = businessWindow(input.date, settings, hours);
  const booked = window
    ? await overlapping(sqlTime(window.open), sqlTime(window.close), undefined)
    : [];
  const intervals = bookingIntervals(booked);
  const slots = availableStarts(
    window,
    quoted.durationMinutes,
    settings,
    intervals,
    input.vehicleId,
  );
  return {
    items: quoted.items,
    totalCents: quoted.totalCents,
    durationMinutes: quoted.durationMinutes,
    slots,
    currencyCode: settings.currencyCode,
  };
}

/** Recorre la grilla sin confundir el paso de inicios con la duración del lavado. */
function availableStarts(
  window: ReturnType<typeof businessWindow>,
  durationMinutes: number,
  settings: NonNullable<Awaited<ReturnType<typeof readSettings>>>,
  intervals: ReturnType<typeof bookingIntervals>,
  vehicleId: string,
) {
  if (!window) return [];
  const slots: string[] = [];
  const duration = durationMinutes * 60000;
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
        vehicleId,
      )
    )
      slots.push(DateTime.fromMillis(start, { zone: 'utc' }).toISO()!);
  }
  return slots;
}

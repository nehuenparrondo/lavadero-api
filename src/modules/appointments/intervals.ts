import type { BookingIntervalRow, Interval } from './appointments.types.js';
import { utcMillis } from './schedule.js';
/** Convierte filas SQL UTC al formato único del cálculo de capacidad.
 * @param bookings - Valor tipado de bookings utilizado por esta operación.
 * @returns `Interval[]`, según el contrato de la operación.
 */
export function bookingIntervals(bookings: BookingIntervalRow[]): Interval[] {
  return bookings.map((v) => ({
    start: utcMillis(v.startsAt),
    end: utcMillis(v.endsAt),
    employeeId: v.employeeId as string | null,
    vehicleId: String(v.vehicleId),
  }));
}

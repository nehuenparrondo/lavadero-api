import { DateTime } from 'luxon';
import { AppError } from '../../errors/AppError.js';
import type { BusinessHour, Settings } from '../settings/settings.repository.js';
import type { Interval } from './appointments.types.js';

/** Interpreta un DATETIME de MySQL como UTC sin depender de la zona del servidor.
 * @param value - Valor tipado de value utilizado por esta operación.
 * @returns `number`, según el contrato de la operación.
 */
export function utcMillis(value: string) {
  return DateTime.fromSQL(value, { zone: 'utc' }).toMillis();
}
/** Formato SQL UTC para persistir y comparar intervalos.
 * @param milliseconds - Valor tipado de milliseconds utilizado por esta operación.
 * @returns `string`, según el contrato de la operación.
 */
export function sqlTime(milliseconds: number) {
  return DateTime.fromMillis(milliseconds, { zone: 'utc' }).toFormat(
    'yyyy-MM-dd HH:mm:ss.SSS',
  );
}
/** Fecha ISO pública con Z.
 * @param value - Valor tipado de value utilizado por esta operación.
 * @returns `string | null`, según el contrato de la operación.
 */
export function isoTime(value: string) {
  return DateTime.fromSQL(value, { zone: 'utc' }).toISO();
}
/** Calcula ventana local de atención de una fecha. Devuelve null si está cerrado.
 * @param date - Fecha de calendario en formato AAAA-MM-DD.
 * @param settings - Configuración operativa vigente del negocio.
 * @param hours - Días y horarios de atención en la zona del negocio.
 * @returns `{ open: number; close: number; } | null`, según el contrato de la operación.
 * @throws Error - Cuando no se cumple una precondición indicada en esta operación.
 */
export function businessWindow(date: string, settings: Settings, hours: BusinessHour[]) {
  const day = DateTime.fromISO(date, { zone: settings.timeZone });
  if (!day.isValid) throw new AppError(400, 'INVALID_DATE', 'La fecha no es válida.');
  const h = hours.find((v) => v.weekday === day.weekday);
  if (!h) return null;
  const open = DateTime.fromISO(`${date}T${h.opensAt}`, { zone: settings.timeZone });
  const close = DateTime.fromISO(`${date}T${h.closesAt}`, { zone: settings.timeZone });
  return { open: open.toMillis(), close: close.toMillis() };
}
/** Comprueba concurrencia máxima por barrido de eventos, no por conteo total de intersecciones.
 * @param start - Inicio UTC en milisegundos; extremo incluido.
 * @param end - Fin UTC en milisegundos; extremo excluido.
 * @param capacity - Cantidad máxima de vehículos atendidos al mismo tiempo.
 * @param intervals - Intervalos ocupados contra los que se verifica la disponibilidad.
 * @param employeeId - Empleado activo que se asigna o consulta.
 * @param vehicleId - Identificador del vehículo cuyo titular y disponibilidad se verifican.
 * @returns `boolean`, según el contrato de la operación.
 */
export function canFit(
  start: number,
  end: number,
  capacity: number,
  intervals: Interval[],
  employeeId?: string | null,
  vehicleId?: string,
) {
  const overlapping = intervals.filter((v) => v.start < end && v.end > start);
  if (
    overlapping.some(
      (v) =>
        (employeeId && v.employeeId === employeeId) ||
        (vehicleId && v.vehicleId === vehicleId),
    )
  )
    return false;
  const events = overlapping.flatMap((v) => [
    { at: Math.max(start, v.start), delta: 1 },
    { at: Math.min(end, v.end), delta: -1 },
  ]);
  events.push({ at: start, delta: 1 }, { at: end, delta: -1 });
  events.sort((a, b) => a.at - b.at || a.delta - b.delta);
  let used = 0;
  for (const event of events) {
    used += event.delta;
    if (used > capacity) return false;
  }
  return true;
}
/** Exige futuro, día abierto, alineación a grilla y finalización dentro de atención.
 * @param start - Inicio UTC en milisegundos; extremo incluido.
 * @param end - Fin UTC en milisegundos; extremo excluido.
 * @param settings - Configuración operativa vigente del negocio.
 * @param hours - Días y horarios de atención en la zona del negocio.
 * @returns `void`, según el contrato de la operación.
 * @throws Error - Cuando no se cumple una precondición indicada en esta operación.
 */
export function assertWorkingTime(
  start: number,
  end: number,
  settings: Settings,
  hours: BusinessHour[],
) {
  const local = DateTime.fromMillis(start, { zone: settings.timeZone });
  const window = businessWindow(local.toISODate()!, settings, hours);
  if (
    start <= Date.now() ||
    !window ||
    start < window.open ||
    end > window.close ||
    (start - window.open) % (settings.slotStepMinutes * 60000) !== 0
  )
    throw new AppError(
      409,
      'SLOT_UNAVAILABLE',
      'El horario no está disponible dentro de la atención del lavadero.',
    );
}

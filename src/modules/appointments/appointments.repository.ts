import type { RowDataPacket } from 'mysql2/promise';
import type { Executor } from '../../utils/db.js';
import { rows } from '../../utils/db.js';
import type { Appointment, BookingIntervalRow, QuoteItem } from './appointments.types.js';
const select = `SELECT CAST(a.id AS CHAR) id,CAST(a.client_id AS CHAR) clientId,CAST(a.employee_id AS CHAR) employeeId,
 CAST(a.vehicle_id AS CHAR) vehicleId,s.code status,a.starts_at startsAt,a.ends_at endsAt,a.currency_code currencyCode,a.version,
 v.plate,v.brand,v.model,v.color,CONCAT(c.first_name,' ',c.last_name) clientName,c.phone clientPhone,
 CONCAT(e.first_name,' ',e.last_name) employeeName,
 COALESCE((SELECT GROUP_CONCAT(applied_service_name ORDER BY service_id SEPARATOR ' · ') FROM appointment_services WHERE appointment_id=a.id),'') serviceSummary,
 COALESCE((SELECT SUM(applied_price_cents) FROM appointment_services WHERE appointment_id=a.id),0) totalCents,
 COALESCE((SELECT SUM(amount_cents) FROM payments WHERE appointment_id=a.id),0) paidCents
 FROM appointments a JOIN appointment_statuses s ON s.id=a.status_id JOIN vehicles v ON v.id=a.vehicle_id
 JOIN users c ON c.id=a.client_id LEFT JOIN users e ON e.id=a.employee_id`;
/** Busca un turno sin revelar datos fuera del servicio autorizado.
 * @param id - Identificador del recurso dentro del proyecto actual.
 * @param executor - Ejecutor SQL; permite participar en la transacción del llamador.
 * @param lock - Si es verdadero, bloquea la fila hasta el final de la transacción.
 * @returns `Promise<Appointment | undefined>`, según el contrato de la operación.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export async function findAppointment(id: string, executor?: Executor, lock = false) {
  if (lock) await rows('SELECT id FROM appointments WHERE id=? FOR UPDATE', [id], executor);
  return (await rows<Appointment>(select + ' WHERE a.id=?', [id], executor))[0];
}
/** Lista mediante condiciones SQL construidas exclusivamente en el repositorio de filtros, nunca desde input libre.
 * @param filter - Predicados cerrados construidos por el repositorio de filtros.
 * @param values - Valores del formulario o parámetros que se serializan para la operación.
 * @param page - Número de página desde uno.
 * @param limit - Cantidad máxima de filas permitida por el esquema de paginación.
 * @param order - Orden permitido ASC o DESC; nunca se acepta SQL libre.
 * @returns `Promise<{ items: Appointment[]; total: number; page: number; limit: number; }>`, según el contrato de la operación.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export async function listAppointments(
  filter: string,
  values: unknown[],
  page: number,
  limit: number,
  order: 'ASC' | 'DESC' = 'DESC',
) {
  const items = await rows<Appointment>(
    select + filter + ` ORDER BY a.starts_at ${order},a.id ${order} LIMIT ? OFFSET ?`,
    [...values, limit, (page - 1) * limit],
  );
  const count = await rows<RowDataPacket>(
    'SELECT COUNT(*) total FROM appointments a JOIN appointment_statuses s ON s.id=a.status_id' +
      filter,
    values,
  );
  return { items, total: Number(count[0]?.total ?? 0), page, limit };
}
/** Obtiene precios activos para todos los servicios de una cotización.
 * @param ids - Identificadores de servicios seleccionados, únicos y validados.
 * @param typeId - Tipo de vehículo para resolver su tarifa vigente.
 * @param executor - Ejecutor SQL; permite participar en la transacción del llamador.
 * @returns `Promise<QuoteItem[]>`, según el contrato de la operación.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export function quoteServices(ids: string[], typeId: string, executor?: Executor) {
  return rows<QuoteItem>(
    `SELECT CAST(s.id AS CHAR) serviceId,s.name,
 s.duration_minutes durationMinutes,p.price_cents priceCents FROM services s JOIN service_prices p ON p.service_id=s.id
 WHERE s.id IN (?) AND p.vehicle_type_id=? AND s.is_active=TRUE AND s.deleted_at IS NULL`,
    [ids, typeId],
    executor,
  );
}
/** Intervalos que intersectan una ventana. Reservas canceladas no ocupan capacidad.
 * @param start - Inicio UTC en formato SQL; extremo incluido.
 * @param end - Fin UTC en formato SQL; extremo excluido.
 * @param excludeId - Turno que debe excluirse al comprobar una reasignación o cambio de estado.
 * @param executor - Ejecutor SQL; permite participar en la transacción del llamador.
 * @returns `Promise<BookingIntervalRow[]>`, según el contrato de la operación.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export function overlapping(
  start: string,
  end: string,
  excludeId: string | undefined,
  executor?: Executor,
) {
  return rows<BookingIntervalRow>(
    `SELECT CAST(a.id AS CHAR) id,
 a.starts_at startsAt,a.ends_at endsAt,CAST(a.employee_id AS CHAR) employeeId,CAST(a.vehicle_id AS CHAR) vehicleId
 FROM appointments a JOIN appointment_statuses s ON s.id=a.status_id WHERE s.code<>'cancelled'
 AND a.starts_at<? AND a.ends_at>? AND (? IS NULL OR a.id<>?)`,
    [end, start, excludeId ?? null, excludeId ?? null],
    executor,
  );
}
export {
  insertAppointment,
  insertItems,
  recordCancellation,
  setEmployee,
  setStatus,
} from './appointments.write.repository.js';
/** Lee servicios históricos.
 * @param id - Identificador del recurso dentro del proyecto actual.
 * @returns `Promise<RowDataPacket[]>`, según el contrato de la operación.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export function readItems(id: string) {
  return rows(
    `SELECT CAST(service_id AS CHAR) serviceId,applied_service_name name,applied_price_cents priceCents,
 applied_duration_minutes durationMinutes FROM appointment_services WHERE appointment_id=?`,
    [id],
  );
}

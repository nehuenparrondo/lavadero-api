import type { RowDataPacket } from 'mysql2/promise';
import { rows, execute } from '../../utils/db.js';
import type { Executor } from '../../utils/db.js';
import type { Appointment, QuoteItem, AppointmentStatus } from './appointments.types.js';
const select = `SELECT CAST(a.id AS CHAR) id,CAST(a.client_id AS CHAR) clientId,CAST(a.employee_id AS CHAR) employeeId,
 CAST(a.vehicle_id AS CHAR) vehicleId,s.code status,a.starts_at startsAt,a.ends_at endsAt,a.currency_code currencyCode,a.version,
 v.plate,v.brand,v.model,v.color,CONCAT(c.first_name,' ',c.last_name) clientName,c.phone clientPhone,
 CONCAT(e.first_name,' ',e.last_name) employeeName,
 COALESCE((SELECT SUM(applied_price_cents) FROM appointment_services WHERE appointment_id=a.id),0) totalCents,
 COALESCE((SELECT SUM(amount_cents) FROM payments WHERE appointment_id=a.id),0) paidCents
 FROM appointments a JOIN appointment_statuses s ON s.id=a.status_id JOIN vehicles v ON v.id=a.vehicle_id
 JOIN users c ON c.id=a.client_id LEFT JOIN users e ON e.id=a.employee_id`;
/** Busca un turno sin revelar datos fuera del servicio autorizado. */
export async function findAppointment(id: string, executor?: Executor, lock = false) {
  if (lock) await rows('SELECT id FROM appointments WHERE id=? FOR UPDATE', [id], executor);
  return (await rows<Appointment>(select + ' WHERE a.id=?', [id], executor))[0];
}
/** Lista mediante condiciones SQL construidas exclusivamente en el servicio, nunca desde input libre. */
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
/** Obtiene precios activos para todos los servicios de una cotización. */
export function quoteServices(ids: string[], typeId: string, executor?: Executor) {
  return rows<QuoteItem>(
    `SELECT CAST(s.id AS CHAR) serviceId,s.name,
 s.duration_minutes durationMinutes,p.price_cents priceCents FROM services s JOIN service_prices p ON p.service_id=s.id
 WHERE s.id IN (?) AND p.vehicle_type_id=? AND s.is_active=TRUE AND s.deleted_at IS NULL`,
    [ids, typeId],
    executor,
  );
}
/** Intervalos que intersectan una ventana. Reservas canceladas no ocupan capacidad. */
export function overlapping(
  start: string,
  end: string,
  excludeId: string | undefined,
  executor?: Executor,
) {
  return rows<RowDataPacket>(
    `SELECT CAST(a.id AS CHAR) id,
 a.starts_at startsAt,a.ends_at endsAt,CAST(a.employee_id AS CHAR) employeeId,CAST(a.vehicle_id AS CHAR) vehicleId
 FROM appointments a JOIN appointment_statuses s ON s.id=a.status_id WHERE s.code<>'cancelled'
 AND a.starts_at<? AND a.ends_at>? AND (? IS NULL OR a.id<>?)`,
    [end, start, excludeId ?? null, excludeId ?? null],
    executor,
  );
}
/** Inserta turno pendiente. El llamador mantiene lock de agenda y snapshot de precios. */
export async function insertAppointment(
  v: {
    clientId: string;
    vehicleId: string;
    startsAt: string;
    endsAt: string;
    createdById: string;
    currencyCode: string;
  },
  executor: Executor,
) {
  return String(
    (
      await execute(
        `INSERT INTO appointments(client_id,vehicle_id,status_id,starts_at,ends_at,created_by_id,currency_code)
 SELECT ?,?,id,?,?,?,? FROM appointment_statuses WHERE code='pending'`,
        [v.clientId, v.vehicleId, v.startsAt, v.endsAt, v.createdById, v.currencyCode],
        executor,
      )
    ).insertId,
  );
}
/** Guarda snapshot de cada servicio. */
export async function insertItems(id: string, items: QuoteItem[], executor: Executor) {
  for (const item of items)
    await execute(
      `INSERT INTO appointment_services
 (appointment_id,service_id,applied_price_cents,applied_duration_minutes,applied_service_name) VALUES(?,?,?,?,?)`,
      [id, item.serviceId, item.priceCents, item.durationMinutes, item.name],
      executor,
    );
}
/** Cambia estado incrementando versión; las reglas viven en service. */
export async function setStatus(
  id: string,
  status: AppointmentStatus,
  actorId: string,
  executor: Executor,
) {
  await execute(
    'UPDATE appointments SET status_id=(SELECT id FROM appointment_statuses WHERE code=?),version=version+1 WHERE id=?',
    [status, id],
    executor,
  );
  await execute(
    'INSERT INTO appointment_status_history(appointment_id,status_id,changed_by_id) SELECT ?,id,? FROM appointment_statuses WHERE code=?',
    [id, actorId, status],
    executor,
  );
}
/** Asignación administrativa. */
export function setEmployee(id: string, employeeId: string, executor: Executor) {
  return execute(
    'UPDATE appointments SET employee_id=?,version=version+1 WHERE id=?',
    [employeeId, id],
    executor,
  );
}
/** Autor y motivo de cancelación. */
export function recordCancellation(
  id: string,
  actorId: string,
  reason: string,
  executor: Executor,
) {
  return execute(
    'UPDATE appointments SET cancelled_by_id=?,cancellation_reason=? WHERE id=?',
    [actorId, reason, id],
    executor,
  );
}
/** Lee servicios históricos. */
export function readItems(id: string) {
  return rows(
    `SELECT CAST(service_id AS CHAR) serviceId,applied_service_name name,applied_price_cents priceCents,
 applied_duration_minutes durationMinutes FROM appointment_services WHERE appointment_id=?`,
    [id],
  );
}
/** Lee notas de trabajo atribuidas al autor. */
export function readNotes(id: string) {
  return rows(
    `SELECT CAST(n.id AS CHAR) id,n.body,n.created_at createdAt,CONCAT(u.first_name,' ',u.last_name) authorName
 FROM appointment_notes n JOIN users u ON u.id=n.author_id WHERE n.appointment_id=? ORDER BY n.id`,
    [id],
  );
}
/** Registra observación. */
export function insertNote(id: string, authorId: string, body: string) {
  return execute(
    'INSERT INTO appointment_notes(appointment_id,author_id,body) VALUES(?,?,?)',
    [id, authorId, body],
  );
}

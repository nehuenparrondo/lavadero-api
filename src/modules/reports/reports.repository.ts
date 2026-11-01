import { rows } from '../../utils/db.js';
/** Trabajos finalizados en el intervalo UTC derivado del calendario local.
 * @param from - Valor tipado de from utilizado por esta operación.
 * @param to - Valor tipado de to utilizado por esta operación.
 * @returns `Promise<import("mysql2").RowDataPacket[]>`, según el contrato de la operación.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export function completedWork(from: string, to: string) {
  return rows(
    `SELECT CAST(a.id AS CHAR) id,a.ends_at endsAt,CAST(a.employee_id AS CHAR) employeeId,
 CONCAT(u.first_name,' ',u.last_name) employeeName FROM appointments a JOIN appointment_statuses s ON s.id=a.status_id
 LEFT JOIN users u ON u.id=a.employee_id WHERE s.code='completed' AND a.ends_at>=? AND a.ends_at<?`,
    [from, to],
  );
}
/** Ingresos contabilizados por momento real del pago, sin multiplicarlos por servicios.
 * @param from - Valor tipado de from utilizado por esta operación.
 * @param to - Valor tipado de to utilizado por esta operación.
 * @returns `Promise<import("mysql2").RowDataPacket[]>`, según el contrato de la operación.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export function revenue(from: string, to: string) {
  return rows(
    'SELECT paid_at paidAt,amount_cents amountCents FROM payments WHERE paid_at>=? AND paid_at<?',
    [from, to],
  );
}
/** Servicios contratados por fecha de atención, excluyendo cancelados.
 * @param from - Valor tipado de from utilizado por esta operación.
 * @param to - Valor tipado de to utilizado por esta operación.
 * @returns `Promise<import("mysql2").RowDataPacket[]>`, según el contrato de la operación.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export function popularServices(from: string, to: string) {
  return rows(
    `SELECT i.applied_service_name name,COUNT(*) count FROM appointment_services i
 JOIN appointments a ON a.id=i.appointment_id JOIN appointment_statuses s ON s.id=a.status_id WHERE s.code<>'cancelled'
 AND a.starts_at>=? AND a.starts_at<? GROUP BY i.applied_service_name ORDER BY count DESC`,
    [from, to],
  );
}
/** Cuenta trabajos propios por estado y fecha, sin revelar ingresos del negocio.
 * @param id - Identificador del recurso dentro del proyecto actual.
 * @param from - Valor tipado de from utilizado por esta operación.
 * @param to - Valor tipado de to utilizado por esta operación.
 * @returns `Promise<import("mysql2").RowDataPacket[]>`, según el contrato de la operación.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export function employeeSummary(id: string, from: string, to: string) {
  return rows(
    `SELECT s.code status,COUNT(*) count FROM appointments a
 JOIN appointment_statuses s ON s.id=a.status_id WHERE a.employee_id=? AND a.starts_at>=? AND a.starts_at<? GROUP BY s.code`,
    [id, from, to],
  );
}

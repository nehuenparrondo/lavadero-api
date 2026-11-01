import type { RowDataPacket } from 'mysql2/promise';
import type { Executor } from '../../utils/db.js';
import { execute, rows } from '../../utils/db.js';
/** Vehículo con IDs serializables y campos propios. */
export interface Vehicle extends RowDataPacket {
  id: string;
  ownerId: string;
  vehicleTypeId: string;
  plate: string;
  brand: string;
  model: string;
  color: string;
  typeName: string;
  deletedAt: string | null;
}
const select = `SELECT CAST(v.id AS CHAR) id,CAST(v.owner_id AS CHAR) ownerId,CAST(v.vehicle_type_id AS CHAR) vehicleTypeId,
 v.plate,v.brand,v.model,v.color,t.name typeName,v.deleted_at deletedAt FROM vehicles v JOIN vehicle_types t ON t.id=v.vehicle_type_id`;
/** Busca vehículo; autorización corresponde al servicio o requireOwnership.
 * @param id - Identificador del recurso dentro del proyecto actual.
 * @param executor - Ejecutor SQL; permite participar en la transacción del llamador.
 * @returns `Promise<Vehicle | undefined>`, según el contrato de la operación.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export async function findVehicle(id: string, executor?: Executor) {
  return (await rows<Vehicle>(select + ' WHERE v.id=?', [id], executor))[0];
}
/** Lista solo propios cuando ownerId está definido.
 * @param ownerId - Valor tipado de ownerId utilizado por esta operación.
 * @param page - Número de página desde uno.
 * @param limit - Cantidad máxima de filas permitida por el esquema de paginación.
 * @param search - Valor tipado de search utilizado por esta operación.
 * @returns `Promise<{ items: Vehicle[]; page: number; limit: number; total: number; }>`, según el contrato de la operación.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export async function listVehicles(
  ownerId: string | undefined,
  page: number,
  limit: number,
  search: string,
) {
  const filter =
    ' WHERE v.deleted_at IS NULL AND (? IS NULL OR v.owner_id=?) AND (v.plate LIKE ? OR v.brand LIKE ?)';
  const args = [ownerId ?? null, ownerId ?? null, `%${search}%`, `%${search}%`];
  const items = await rows<Vehicle>(select + filter + ' ORDER BY v.id DESC LIMIT ? OFFSET ?', [
    ...args,
    limit,
    (page - 1) * limit,
  ]);
  const count = await rows<RowDataPacket>(
    'SELECT COUNT(*) total FROM vehicles v' + filter,
    args,
  );
  return { items, page, limit, total: Number(count[0]?.total ?? 0) };
}
/** Guarda vehículo validado usando parámetros.
 * @param v - Datos tipados del elemento o formulario que se transforma.
 * @returns `Promise<string>`, según el contrato de la operación.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export async function insertVehicle(v: Omit<Vehicle, 'id' | 'typeName' | 'deletedAt'>) {
  return String(
    (
      await execute(
        'INSERT INTO vehicles(owner_id,vehicle_type_id,plate,brand,model,color) VALUES(?,?,?,?,?,?)',
        [v.ownerId, v.vehicleTypeId, v.plate, v.brand, v.model, v.color],
      )
    ).insertId,
  );
}
/** Actualiza columnas permitidas del vehículo.
 * @param id - Identificador del recurso dentro del proyecto actual.
 * @param v - Datos tipados del elemento o formulario que se transforma.
 * @param executor - Ejecutor SQL; permite participar en la transacción del llamador.
 * @returns `Promise<void>`, según el contrato de la operación.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export async function updateVehicle(id: string, v: Vehicle, executor?: Executor) {
  await execute(
    'UPDATE vehicles SET owner_id=?,vehicle_type_id=?,plate=?,brand=?,model=?,color=? WHERE id=?',
    [v.ownerId, v.vehicleTypeId, v.plate, v.brand, v.model, v.color, id],
    executor,
  );
}
/** Elimina lógicamente sin perder historial.
 * @param id - Identificador del recurso dentro del proyecto actual.
 * @param executor - Ejecutor SQL; permite participar en la transacción del llamador.
 * @returns `Promise<boolean>`, según el contrato de la operación.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export async function removeVehicle(id: string, executor?: Executor) {
  const active = await rows<RowDataPacket>(
    `SELECT a.id FROM appointments a JOIN appointment_statuses s ON s.id=a.status_id
 WHERE a.vehicle_id=? AND s.code IN ('pending','confirmed','in_progress') LIMIT 1`,
    [id],
    executor,
  );
  if (active.length) return false;
  await execute('UPDATE vehicles SET deleted_at=UTC_TIMESTAMP(3) WHERE id=?', [id], executor);
  return true;
}
/** Indica si el tipo está habilitado para nuevos vehículos.
 * @param id - Identificador del recurso dentro del proyecto actual.
 * @returns `Promise<boolean>`, según el contrato de la operación.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export async function isVehicleTypeActive(id: string) {
  return Boolean(
    (await rows('SELECT id FROM vehicle_types WHERE id=? AND is_active=TRUE', [id]))[0],
  );
}

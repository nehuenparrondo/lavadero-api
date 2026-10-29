import type { RowDataPacket } from 'mysql2/promise';
import { rows, execute } from '../../utils/db.js';
import type { Executor } from '../../utils/db.js';
/** Servicio de catálogo. */
export interface Service extends RowDataPacket {
  id: string;
  code: string;
  name: string;
  description: string;
  durationMinutes: number;
  isActive: number;
}
const select =
  'SELECT CAST(id AS CHAR) id,code,name,description,duration_minutes durationMinutes,is_active isActive FROM services';
/** Lee catálogo sin borrar historia; admin puede incluir inactivos. */
export function listServices(includeInactive: boolean) {
  return rows<Service>(
    select + ' WHERE deleted_at IS NULL AND (? OR is_active=TRUE) ORDER BY id',
    [includeInactive],
  );
}
/** Busca servicio por ID. */
export async function findService(id: string, executor?: Executor) {
  return (
    await rows<Service>(select + ' WHERE id=? AND deleted_at IS NULL', [id], executor)
  )[0];
}
/** Precios vigentes, agrupables por tipo en el servicio. */
export function listPrices() {
  return rows<RowDataPacket>(
    `SELECT CAST(service_id AS CHAR) serviceId,CAST(vehicle_type_id AS CHAR) vehicleTypeId,price_cents priceCents FROM service_prices`,
  );
}
/** Inserta un servicio de catálogo validado. */
export async function insertService(v: {
  code: string;
  name: string;
  description: string;
  durationMinutes: number;
  isActive: boolean;
}) {
  return String(
    (
      await execute(
        'INSERT INTO services(code,name,description,duration_minutes,is_active) VALUES(?,?,?,?,?)',
        [v.code, v.name, v.description, v.durationMinutes, v.isActive],
      )
    ).insertId,
  );
}
/** Actualiza datos sin modificar snapshots de turnos previos. */
export async function updateService(
  id: string,
  v: {
    code: string;
    name: string;
    description: string;
    durationMinutes: number;
    isActive: boolean;
  },
) {
  await execute(
    'UPDATE services SET code=?,name=?,description=?,duration_minutes=?,is_active=? WHERE id=?',
    [v.code, v.name, v.description, v.durationMinutes, v.isActive, id],
  );
}
/** Desactiva y borra lógicamente un servicio. */
export function removeService(id: string) {
  return execute(
    'UPDATE services SET is_active=FALSE,deleted_at=UTC_TIMESTAMP(3) WHERE id=?',
    [id],
  );
}
/** Upsert de un precio vigente por par servicio/tipo. */
export function savePrice(id: string, typeId: string, cents: number) {
  return execute(
    `INSERT INTO service_prices(service_id,vehicle_type_id,price_cents)
 VALUES(?,?,?) ON DUPLICATE KEY UPDATE price_cents=?`,
    [id, typeId, cents, cents],
  );
}

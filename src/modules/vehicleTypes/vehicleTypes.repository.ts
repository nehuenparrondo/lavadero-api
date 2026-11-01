import { execute, rows } from '../../utils/db.js';
/** Lista tipos de vehículo con ID string.
 * @param admin - Habilita controles de gestión; el servidor conserva la autorización real.
 * @returns `Promise<import("mysql2").RowDataPacket[]>`.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export function listTypes(admin: boolean) {
  return rows(
    'SELECT CAST(id AS CHAR) id,code,name,is_active isActive FROM vehicle_types WHERE (? OR is_active=TRUE) ORDER BY id',
    [admin],
  );
}
/** Crea tipo y devuelve ID.
 * @param v - Datos tipados del elemento o formulario que se transforma.
 * @returns `Promise<string>`.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export async function insertType(v: { code: string; name: string; isActive: boolean }) {
  return String(
    (
      await execute('INSERT INTO vehicle_types(code,name,is_active) VALUES(?,?,?)', [
        v.code,
        v.name,
        v.isActive,
      ])
    ).insertId,
  );
}
/** Edita tipo.
 * @param id - Identificador del recurso dentro del proyecto actual.
 * @param v - Datos tipados del elemento o formulario que se transforma.
 * @returns `Promise<import("mysql2").ResultSetHeader>`.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export function updateType(id: string, v: { code: string; name: string; isActive: boolean }) {
  return execute('UPDATE vehicle_types SET code=?,name=?,is_active=? WHERE id=?', [
    v.code,
    v.name,
    v.isActive,
    id,
  ]);
}
/** Baja lógica del tipo.
 * @param id - Identificador del recurso dentro del proyecto actual.
 * @returns `Promise<import("mysql2").ResultSetHeader>`.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export function deactivateType(id: string) {
  return execute('UPDATE vehicle_types SET is_active=FALSE WHERE id=?', [id]);
}

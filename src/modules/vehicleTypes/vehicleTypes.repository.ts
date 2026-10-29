import { rows, execute } from '../../utils/db.js';
/** Lista tipos de vehículo con ID string. */
export function listTypes(admin: boolean) {
  return rows(
    'SELECT CAST(id AS CHAR) id,code,name,is_active isActive FROM vehicle_types WHERE (? OR is_active=TRUE) ORDER BY id',
    [admin],
  );
}
/** Crea tipo y devuelve ID. */
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
/** Edita tipo. */
export function updateType(id: string, v: { code: string; name: string; isActive: boolean }) {
  return execute('UPDATE vehicle_types SET code=?,name=?,is_active=? WHERE id=?', [
    v.code,
    v.name,
    v.isActive,
    id,
  ]);
}
/** Baja lógica del tipo. */
export function deactivateType(id: string) {
  return execute('UPDATE vehicle_types SET is_active=FALSE WHERE id=?', [id]);
}

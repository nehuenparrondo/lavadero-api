import type { RowDataPacket } from 'mysql2/promise';
import type { Role } from '../../types/domain.js';
import type { Executor } from '../../utils/db.js';
import { execute, rows } from '../../utils/db.js';

/** Serializa todos los cambios que podrían eliminar el último administrador.
 * @param executor - Ejecutor SQL; permite participar en la transacción del llamador.
 * @returns `Promise<void>`, según el contrato de la operación.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export async function lockAdminGuard(executor: Executor) {
  await rows("SELECT id FROM roles WHERE code='admin' FOR UPDATE", [], executor);
}
/** Cuenta administradores vigentes dentro de la transacción que tiene el guard.
 * @param executor - Ejecutor SQL; permite participar en la transacción del llamador.
 * @returns `Promise<number>`, según el contrato de la operación.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export async function countActiveAdmins(executor: Executor) {
  const result = await rows<RowDataPacket>(
    `SELECT COUNT(*) total FROM users u JOIN roles r ON r.id=u.role_id
    WHERE r.code='admin' AND u.is_active=TRUE AND u.deleted_at IS NULL`,
    [],
    executor,
  );
  return Number(result[0]?.total ?? 0);
}
/** Cambia rol usando catálogo, nunca un ID recibido del cliente.
 * @param id - Identificador del recurso dentro del proyecto actual.
 * @param role - Rol permitido del catálogo de seguridad.
 * @param executor - Ejecutor SQL; permite participar en la transacción del llamador.
 * @returns `Promise<void>`, según el contrato de la operación.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export async function setRole(id: string, role: Role, executor: Executor) {
  await execute(
    'UPDATE users SET role_id=(SELECT id FROM roles WHERE code=?) WHERE id=?',
    [role, id],
    executor,
  );
}
/** Actualiza permisos o estado lógico con lista cerrada de columnas.
 * @param id - Identificador del recurso dentro del proyecto actual.
 * @param email - Valor tipado de email utilizado por esta operación.
 * @param active - Valor tipado de active utilizado por esta operación.
 * @param canPay - Valor tipado de canPay utilizado por esta operación.
 * @param deleted - Valor tipado de deleted utilizado por esta operación.
 * @param executor - Ejecutor SQL; permite participar en la transacción del llamador.
 * @returns `Promise<void>`, según el contrato de la operación.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export async function setAccount(
  id: string,
  email: string,
  active: boolean,
  canPay: boolean,
  deleted: boolean,
  executor: Executor,
) {
  await execute(
    `UPDATE users SET email=?,is_active=?,can_record_payments=?,deleted_at=? WHERE id=?`,
    [email, active, canPay, deleted ? new Date() : null, id],
    executor,
  );
}
/** Cambia hash, no contraseña legible.
 * @param id - Identificador del recurso dentro del proyecto actual.
 * @param hash - Hash del token; evita persistir su valor legible.
 * @param executor - Ejecutor SQL; permite participar en la transacción del llamador.
 * @returns `Promise<void>`, según el contrato de la operación.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export async function setPassword(id: string, hash: string, executor: Executor) {
  await execute('UPDATE users SET password_hash=? WHERE id=?', [hash, id], executor);
}

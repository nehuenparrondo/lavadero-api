import { rows, execute } from '../../utils/db.js';
import type { Executor } from '../../utils/db.js';
import type { Identity } from './users.types.js';
import type { Role } from '../../types/domain.js';

const fields = `SELECT CAST(u.id AS CHAR) id,u.email,u.password_hash passwordHash,r.code role,
 u.first_name firstName,u.last_name lastName,u.phone,u.avatar_url avatarUrl,
 u.auth_version authVersion,u.can_record_payments canRecordPayments,u.is_active isActive,u.deleted_at deletedAt
 FROM users u JOIN roles r ON r.id=u.role_id`;
/** Obtiene identidad interna por ID, incluyendo estado lógico. */
export async function findUser(id: string, executor?: Executor) {
  return (await rows<Identity>(fields + ' WHERE u.id=?', [id], executor))[0];
}
/** Busca email normalizado para login o vinculación OAuth verificada. */
export async function findByEmail(email: string, executor?: Executor) {
  return (
    await rows<Identity>(fields + ' WHERE u.email=?', [email.toLowerCase()], executor)
  )[0];
}
/** Inserta una identidad; el servicio decide el rol autorizado. */
export async function insertUser(
  input: {
    email: string;
    firstName: string;
    lastName: string;
    phone?: string | null | undefined;
  },
  hash: string | null,
  role: Role,
  executor?: Executor,
) {
  const result = await execute(
    `INSERT INTO users (role_id,email,password_hash,first_name,last_name,phone)
    SELECT id,?,?,?,?,? FROM roles WHERE code=?`,
    [
      input.email.toLowerCase(),
      hash,
      input.firstName,
      input.lastName,
      input.phone ?? null,
      role,
    ],
    executor,
  );
  return String(result.insertId);
}
/** Lista usuarios sin hashes con búsqueda y paginación; filtros son valores parametrizados. */
export async function listUsers(
  search: string,
  role: string | undefined,
  page: number,
  limit: number,
) {
  const term = `%${search}%`;
  const filter =
    " WHERE u.deleted_at IS NULL AND (u.email LIKE ? OR CONCAT(u.first_name,' ',u.last_name) LIKE ?) AND (? IS NULL OR r.code=?)";
  const values = [term, term, role ?? null, role ?? null];
  const items = await rows<Identity>(
    fields + filter + ' ORDER BY u.id DESC LIMIT ? OFFSET ?',
    [...values, limit, (page - 1) * limit],
  );
  const all = await rows<Identity>(
    'SELECT COUNT(*) total FROM users u JOIN roles r ON r.id=u.role_id' + filter,
    values,
  );
  return { items, total: Number(all[0]?.total ?? 0), page, limit };
}
/** Actualiza únicamente campos de perfil permitidos. */
export async function updateProfile(
  id: string,
  input: {
    firstName: string;
    lastName: string;
    phone: string | null;
    avatarUrl: string | null;
  },
  executor?: Executor,
) {
  await execute(
    'UPDATE users SET first_name=?,last_name=?,phone=?,avatar_url=? WHERE id=?',
    [input.firstName, input.lastName, input.phone, input.avatarUrl, id],
    executor,
  );
}
/** Invalida permisos antiguos y todos los refresh de una cuenta. */
export async function revokeUserSessions(id: string, executor: Executor) {
  await execute('UPDATE users SET auth_version=auth_version+1 WHERE id=?', [id], executor);
  await execute(
    'UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,UTC_TIMESTAMP(3)) WHERE user_id=?',
    [id],
    executor,
  );
}

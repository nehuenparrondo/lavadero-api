import type { RowDataPacket } from 'mysql2/promise';
import { rows, execute } from '../../utils/db.js';
import type { Executor } from '../../utils/db.js';

/** Sesión interna bloqueada durante rotación. */
export interface SessionRow extends RowDataPacket {
  id: string;
  userId: string;
  familyId: string;
  revokedAt: string | null;
  expiresAt: string;
}
/** Inserta hash de refresh con familia y expiración. */
export async function insertSession(
  userId: string,
  hash: Buffer,
  familyId: string,
  executor?: Executor,
) {
  const result = await execute(
    `INSERT INTO refresh_tokens(user_id,token_hash,family_id,expires_at)
    VALUES(?,?,?,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 30 DAY))`,
    [userId, hash, familyId],
    executor,
  );
  return String(result.insertId);
}
/** Consulta y bloquea un refresh para consumirlo exactamente una vez. */
export async function lockSession(hash: Buffer, executor: Executor) {
  return (
    await rows<SessionRow>(
      `SELECT CAST(id AS CHAR) id,CAST(user_id AS CHAR) userId,
    family_id familyId,revoked_at revokedAt,expires_at expiresAt FROM refresh_tokens WHERE token_hash=? FOR UPDATE`,
      [hash],
      executor,
    )
  )[0];
}
/** Revoca familia ante logout o detección de refresh reutilizado. */
export async function revokeFamily(familyId: string, executor: Executor) {
  await execute(
    'UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,UTC_TIMESTAMP(3)) WHERE family_id=?',
    [familyId],
    executor,
  );
}
/** Registra el token sucesor conservando el anterior para detectar reuso. */
export async function rotateSession(id: string, nextId: string, executor: Executor) {
  await execute(
    'UPDATE refresh_tokens SET revoked_at=UTC_TIMESTAMP(3),replaced_by_id=? WHERE id=?',
    [nextId, id],
    executor,
  );
}
/** Valida que la familia del JWT siga activa tras logout o reuso de refresh. */
export async function isFamilyActive(userId: string, familyId: string) {
  return Boolean(
    (
      await rows(
        'SELECT id FROM refresh_tokens WHERE user_id=? AND family_id=? AND revoked_at IS NULL AND expires_at>UTC_TIMESTAMP(3) LIMIT 1',
        [userId, familyId],
      )
    )[0],
  );
}

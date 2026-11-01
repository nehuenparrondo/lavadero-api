import { execute, rows } from '../../utils/db.js';

/** Lee notas atribuidas a su autor, después de autorizar el turno en service.
 * @param id - Identificador del recurso dentro del proyecto actual.
 * @returns `Promise<import("mysql2").RowDataPacket[]>`, según el contrato de la operación.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export function readNotes(id: string) {
  return rows(
    `SELECT CAST(n.id AS CHAR) id,n.body,n.created_at createdAt,CONCAT(u.first_name,' ',u.last_name) authorName
 FROM appointment_notes n JOIN users u ON u.id=n.author_id WHERE n.appointment_id=? ORDER BY n.id`,
    [id],
  );
}

/** Persiste una observación; el autor proviene de la sesión autenticada.
 * @param id - Identificador del recurso dentro del proyecto actual.
 * @param authorId - Valor tipado de authorId utilizado por esta operación.
 * @param body - Valor tipado de body utilizado por esta operación.
 * @returns `Promise<import("mysql2").ResultSetHeader>`, según el contrato de la operación.
 * @throws Error - Si falla la persistencia o el servicio remoto; se conserva el manejo central de errores.
 */
export function insertNote(id: string, authorId: string, body: string) {
  return execute(
    'INSERT INTO appointment_notes(appointment_id,author_id,body) VALUES(?,?,?)',
    [id, authorId, body],
  );
}

import { rows, execute } from '../../utils/db.js';

/** Lee notas atribuidas a su autor, después de autorizar el turno en service. */
export function readNotes(id: string) {
  return rows(
    `SELECT CAST(n.id AS CHAR) id,n.body,n.created_at createdAt,CONCAT(u.first_name,' ',u.last_name) authorName
 FROM appointment_notes n JOIN users u ON u.id=n.author_id WHERE n.appointment_id=? ORDER BY n.id`,
    [id],
  );
}

/** Persiste una observación; el autor proviene de la sesión autenticada. */
export function insertNote(id: string, authorId: string, body: string) {
  return execute(
    'INSERT INTO appointment_notes(appointment_id,author_id,body) VALUES(?,?,?)',
    [id, authorId, body],
  );
}

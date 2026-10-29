import { rows, execute } from '../../utils/db.js';
import type { Executor } from '../../utils/db.js';
/** Lista cobros del turno sin datos de autenticación. */
export function listPayments(id: string, executor?: Executor) {
  return rows(
    `SELECT CAST(id AS CHAR) id,CAST(appointment_id AS CHAR) appointmentId,
 amount_cents amountCents,method,reference,paid_at paidAt,idempotency_key idempotencyKey FROM payments WHERE appointment_id=? ORDER BY id`,
    [id],
    executor,
  );
}
/** Busca un reintento de cobro por clave global. */
export async function findPayment(key: string, executor: Executor) {
  return (
    await rows(
      `SELECT CAST(appointment_id AS CHAR) appointmentId,amount_cents amountCents,
 method,reference FROM payments WHERE idempotency_key=?`,
      [key],
      executor,
    )
  )[0];
}
/** Inserta cobro bajo lock del turno; service valida saldo. */
export async function insertPayment(
  id: string,
  actorId: string,
  v: {
    amountCents: number;
    method: string;
    reference?: string | null | undefined;
    idempotencyKey: string;
  },
  executor: Executor,
) {
  return String(
    (
      await execute(
        'INSERT INTO payments(appointment_id,recorded_by_id,amount_cents,method,reference,idempotency_key) VALUES(?,?,?,?,?,?)',
        [id, actorId, v.amountCents, v.method, v.reference ?? null, v.idempotencyKey],
        executor,
      )
    ).insertId,
  );
}

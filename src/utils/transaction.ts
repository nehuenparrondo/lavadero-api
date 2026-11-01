import type { PoolConnection } from 'mysql2/promise';
import { db } from './db.js';

/** Ejecuta una operación atómica y libera conexión aun si falla. @throws Error de la operación.
 * @param operation - Valor tipado de operation utilizado por esta operación.
 * @returns `Promise<T>`, según el contrato de la operación.
 */
export async function transaction<T>(
  operation: (connection: PoolConnection) => Promise<T>,
): Promise<T> {
  const connection = await db().getConnection();
  try {
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

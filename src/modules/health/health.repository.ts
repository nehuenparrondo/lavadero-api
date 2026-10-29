import { database } from '../../config/database.js';

/** Verifica MySQL sin escribir. @throws Error si MySQL no responde o no está configurado. */
export async function checkDatabase(): Promise<void> {
  if (!database) throw new Error('Base de datos sin configurar.');
  await database.query('SELECT 1');
}

import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { createHash } from 'node:crypto';
import { splitSqlStatements } from './splitSqlStatements.js';

/** Serializa migraciones por base para evitar dos arranques modificando el esquema a la vez. */
export async function lockMigrations(connection: PoolConnection): Promise<string> {
  const [rows] = await connection.query<RowDataPacket[]>('SELECT DATABASE() AS name');
  const key = createHash('sha256').update(String(rows[0]?.name)).digest('hex').slice(0, 32);
  const [result] = await connection.execute<RowDataPacket[]>(
    'SELECT GET_LOCK(?, 60) AS acquired',
    [key],
  );
  if (Number(result[0]?.acquired) !== 1)
    throw new Error('No se pudo obtener lock de migración.');
  return key;
}

/** Crea el registro de migraciones, independiente de las tablas de negocio. */
export async function ensureMigrationTable(connection: PoolConnection): Promise<void> {
  await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name VARCHAR(150) PRIMARY KEY, checksum CHAR(64) NOT NULL,
    applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB`);
}

/** Ejecuta una migración nueva o comprueba que su contenido no cambió tras aplicarla. */
export async function applyMigration(connection: PoolConnection, name: string, sql: string) {
  const checksum = createHash('sha256').update(sql).digest('hex');
  const [existing] = await connection.execute<RowDataPacket[]>(
    'SELECT checksum FROM schema_migrations WHERE name = ?',
    [name],
  );
  if (existing[0]) {
    if (existing[0].checksum !== checksum) throw new Error(`Migración modificada: ${name}`);
    return;
  }
  // El separador explícito evita interpretar puntos y coma dentro de datos o comentarios.
  for (const statement of splitSqlStatements(sql)) {
    await connection.query(statement);
  }
  await connection.execute('INSERT INTO schema_migrations (name, checksum) VALUES (?, ?)', [
    name,
    checksum,
  ]);
  console.info(`Migración aplicada: ${name}`);
}

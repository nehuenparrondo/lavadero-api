import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { database } from '../src/config/database.js';

if (!database || process.env.NODE_ENV !== 'test') {
  throw new Error(
    'Usá NODE_ENV=test y DATABASE_URL de una base de pruebas migrada y sembrada.',
  );
}
const pool = database;
after(async () => {
  await pool.end();
});

test('catálogos y configuración confirmada existen', async () => {
  const [roles] = await pool.query<RowDataPacket[]>('SELECT code FROM roles ORDER BY code');
  assert.deepEqual(
    roles.map((row) => row.code),
    ['admin', 'client', 'employee'],
  );
  const [settings] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM business_settings WHERE id=1',
  );
  assert.equal(settings[0]?.currency_code, 'ARS');
  assert.equal(settings[0]?.simultaneous_capacity, 1);
  assert.equal(settings[0]?.slot_step_minutes, 5);
  const [hours] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM business_hours ORDER BY weekday',
  );
  assert.deepEqual(
    hours.map((row) => row.weekday),
    [1, 2, 3, 4, 5, 6],
  );
  assert.equal(hours[0]?.opens_at, '09:30:00');
  assert.equal(hours[0]?.closes_at, '16:30:00');
});

test('email, patente y claves foráneas se protegen en MySQL', async () => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const email = `${randomUUID()}@example.invalid`;
    const [user] = await connection.execute<ResultSetHeader>(
      "INSERT INTO users (role_id,email,first_name) SELECT id,?,'Test' FROM roles WHERE code='client'",
      [email],
    );
    await assert.rejects(
      connection.execute(
        'INSERT INTO users (role_id,email,first_name) SELECT role_id,?,first_name FROM users WHERE id=?',
        [email, user.insertId],
      ),
      { code: 'ER_DUP_ENTRY' },
    );
    await connection.execute(
      "INSERT INTO vehicles (owner_id,vehicle_type_id,plate,brand,model,color) SELECT ?,id,'TESTSQL01','A','B','C' FROM vehicle_types WHERE code='car'",
      [user.insertId],
    );
    await assert.rejects(
      connection.execute(
        "INSERT INTO vehicles (owner_id,vehicle_type_id,plate,brand,model,color) SELECT ?,id,'testsql01','A','B','C' FROM vehicle_types WHERE code='car'",
        [user.insertId],
      ),
      { code: 'ER_DUP_ENTRY' },
    );
    await assert.rejects(
      connection.execute(
        "INSERT INTO users (role_id,email,first_name) VALUES (255,?,'Invalid')",
        [randomUUID() + '@example.invalid'],
      ),
      { code: 'ER_NO_REFERENCED_ROW_2' },
    );
  } finally {
    await connection.rollback();
    connection.release();
  }
});

test('MySQL rechaza duración cero y un rango horario invertido', async () => {
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    await assert.rejects(
      connection.execute(
        "INSERT INTO services (code,name,description,duration_minutes) VALUES (?,'Test','Test',0)",
        [randomUUID()],
      ),
      { code: 'ER_CHECK_CONSTRAINT_VIOLATED' },
    );
    await assert.rejects(
      connection.query(
        "UPDATE business_hours SET opens_at='17:00:00',closes_at='09:00:00' WHERE weekday=1",
      ),
      { code: 'ER_CHECK_CONSTRAINT_VIOLATED' },
    );
  } finally {
    await connection.rollback();
    connection.release();
  }
});

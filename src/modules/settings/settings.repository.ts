import type { RowDataPacket } from 'mysql2/promise';
import { rows, execute } from '../../utils/db.js';
import type { Executor } from '../../utils/db.js';
/** Configuración interna de una sucursal. */
export interface Settings extends RowDataPacket {
  currencyCode: string;
  timeZone: string;
  cancellationNoticeMinutes: number;
  simultaneousCapacity: number;
  slotStepMinutes: number;
}
/** Horario local por día ISO. */
export interface BusinessHour extends RowDataPacket {
  weekday: number;
  opensAt: string;
  closesAt: string;
}
const select = `SELECT currency_code currencyCode,time_zone timeZone,cancellation_notice_minutes cancellationNoticeMinutes,
 simultaneous_capacity simultaneousCapacity,slot_step_minutes slotStepMinutes FROM business_settings WHERE id=1`;
/** Lee configuración o bloquea la fila común para serializar cambios de agenda y reservas. */
export async function readSettings(executor?: Executor, lock = false) {
  return (await rows<Settings>(select + (lock ? ' FOR UPDATE' : ''), [], executor))[0];
}
/** Lee días abiertos, sin filas para días cerrados. */
export function readHours(executor?: Executor) {
  return rows<BusinessHour>(
    'SELECT weekday,opens_at opensAt,closes_at closesAt FROM business_hours ORDER BY weekday',
    [],
    executor,
  );
}
/** Guarda parámetros bajo la misma transacción de horario. */
export async function updateSettings(
  input: {
    timeZone: string;
    cancellationNoticeMinutes: number;
    simultaneousCapacity: number;
    slotStepMinutes: number;
  },
  executor: Executor,
) {
  await execute(
    'UPDATE business_settings SET time_zone=?,cancellation_notice_minutes=?,simultaneous_capacity=?,slot_step_minutes=? WHERE id=1',
    [
      input.timeZone,
      input.cancellationNoticeMinutes,
      input.simultaneousCapacity,
      input.slotStepMinutes,
    ],
    executor,
  );
}
/** Reemplaza la semana completa de forma atómica. */
export async function updateHours(
  hours: { weekday: number; opensAt: string; closesAt: string }[],
  executor: Executor,
) {
  await execute('DELETE FROM business_hours', [], executor);
  for (const h of hours)
    await execute(
      'INSERT INTO business_hours(weekday,opens_at,closes_at) VALUES(?,?,?)',
      [h.weekday, h.opensAt, h.closesAt],
      executor,
    );
}

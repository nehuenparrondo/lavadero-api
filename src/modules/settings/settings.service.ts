import type { z } from 'zod';
import { transaction } from '../../utils/transaction.js';
import { AppError } from '../../errors/AppError.js';
import * as repo from './settings.repository.js';
import type { settingsSchema } from './settings.schema.js';
/** Lee configuración pública de operación, sin datos privados. */
export async function getSettings() {
  const settings = await repo.readSettings();
  if (!settings)
    throw new AppError(503, 'SETTINGS_MISSING', 'El negocio todavía no fue configurado.');
  return { ...settings, hours: await repo.readHours() };
}
/** Guarda la configuración serializando con las reservas en curso. No reprograma turnos existentes. */
export async function saveSettings(input: z.infer<typeof settingsSchema>) {
  await transaction(async (connection) => {
    await repo.readSettings(connection, true);
    await repo.updateSettings(input, connection);
    await repo.updateHours(input.hours, connection);
  });
  return getSettings();
}

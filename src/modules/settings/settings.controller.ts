import type { Request } from 'express';
import type { z } from 'zod';
import { getSettings, saveSettings } from './settings.service.js';
import type { settingsSchema } from './settings.schema.js';
/** Consulta configuración del negocio. */
export function get() {
  return getSettings();
}
/** Guarda configuración administrativa validada. */
export function save(r: Request) {
  return saveSettings(r.body as z.infer<typeof settingsSchema>);
}

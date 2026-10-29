import { envSchema } from './envSchema.js';

/** Lee variables sin efectos secundarios. @throws Error si falta configuración válida. */
export function readEnv(source: NodeJS.ProcessEnv) {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join('.') || 'entorno');
    throw new Error(`Configuración inválida: ${fields.join(', ')}. Revisá .env.example.`);
  }
  return parsed.data;
}

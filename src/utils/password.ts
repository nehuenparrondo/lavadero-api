import bcrypt from 'bcrypt';
import { z } from 'zod';

/** Límite por bytes: bcrypt admite como máximo 72 bytes sin truncar. */
export const passwordSchema = z
  .string()
  .min(12, 'Usá al menos 12 caracteres.')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'La contraseña supera 72 bytes.');
/** Hashea con costo 12. @returns Hash bcrypt; nunca contraseña legible. */
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}
/** Compara sin exponer el hash al frontend. */
export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

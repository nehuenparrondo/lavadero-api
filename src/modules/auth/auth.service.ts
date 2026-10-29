import type { z } from 'zod';
import { findByEmail, findUser, insertUser } from '../users/users.repository.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { transaction } from '../../utils/transaction.js';
import { AppError } from '../../errors/AppError.js';
import { createSession } from './session.service.js';
import { signAccess } from './token.service.js';
import type { registerSchema, loginSchema } from './auth.schema.js';

/** Registra siempre Cliente y no acepta privilegios del request. */
export async function register(input: z.infer<typeof registerSchema>) {
  await signAccess({
    id: 'configuration-check',
    role: 'client',
    authVersion: 0,
    canRecordPayments: false,
  });
  const hash = await hashPassword(input.password);
  return transaction(async (connection) => {
    const id = await insertUser(input, hash, 'client', connection);
    const identity = await findUser(id, connection);
    if (!identity) throw new Error('No se pudo leer la cuenta creada.');
    return createSession(identity, connection);
  });
}
/** Autentica sin revelar si el email o la contraseña fue incorrecto. */
export async function login(input: z.infer<typeof loginSchema>) {
  const identity = await findByEmail(input.email);
  if (
    !identity?.passwordHash ||
    !identity.isActive ||
    identity.deletedAt ||
    !(await comparePassword(input.password, identity.passwordHash))
  ) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos.');
  }
  return createSession(identity);
}

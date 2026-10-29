import type { z } from 'zod';
import type { Actor } from '../../types/domain.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { AppError } from '../../errors/AppError.js';
import { hashPassword, comparePassword } from '../../utils/password.js';
import { transaction } from '../../utils/transaction.js';
import * as repository from './users.repository.js';
import { setPassword } from './admin.repository.js';
import { publicUser } from './users.types.js';
import type {
  profileSchema,
  passwordChangeSchema,
  createUserSchema,
  usersQuerySchema,
} from './users.schema.js';

/** Lee perfil por ID y exige que la cuenta exista. */
export async function getProfile(id: string) {
  const user = await repository.findUser(id);
  if (!user || user.deletedAt) throw new NotFoundError();
  return publicUser(user);
}
/** Guarda solo perfil permitido, preservando campos omitidos. */
export async function updateOwnProfile(current: Actor, input: z.infer<typeof profileSchema>) {
  const user = await getProfile(current.id);
  await repository.updateProfile(current.id, {
    firstName: input.firstName ?? user.firstName,
    lastName: input.lastName ?? user.lastName,
    phone: input.phone === undefined ? user.phone : input.phone,
    avatarUrl: input.avatarUrl === undefined ? user.avatarUrl : input.avatarUrl,
  });
  return getProfile(current.id);
}
/** Alta administrativa con contraseña hasheada y rol previamente autorizado por ruta. */
export async function createUser(input: z.infer<typeof createUserSchema>) {
  const id = await repository.insertUser(
    input,
    await hashPassword(input.password),
    input.role,
  );
  return getProfile(id);
}
/** Lista perfiles sin datos de autenticación. */
export async function listUsers(input: z.infer<typeof usersQuerySchema>) {
  const result = await repository.listUsers(input.search, input.role, input.page, input.limit);
  return { ...result, items: result.items.map(publicUser) };
}
/** Verifica contraseña actual y revoca sesiones anteriores al cambiarla. */
export async function changePassword(
  current: Actor,
  input: z.infer<typeof passwordChangeSchema>,
) {
  const identity = await repository.findUser(current.id);
  if (
    !identity?.passwordHash ||
    !(await comparePassword(input.currentPassword, identity.passwordHash))
  )
    throw new AppError(
      400,
      'INVALID_PASSWORD',
      'La contraseña actual no es correcta o la cuenta usa acceso social.',
    );
  const hash = await hashPassword(input.newPassword);
  await transaction(async (connection) => {
    await setPassword(current.id, hash, connection);
    await repository.revokeUserSessions(current.id, connection);
  });
  return { passwordChanged: true, requiresLogin: true };
}

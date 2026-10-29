import type { z } from 'zod';
import type { Actor, Role } from '../../types/domain.js';
import { transaction } from '../../utils/transaction.js';
import { ForbiddenError } from '../../errors/ForbiddenError.js';
import { ConflictError } from '../../errors/ConflictError.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
import * as guard from './admin.repository.js';
import * as repository from './users.repository.js';
import { publicUser } from './users.types.js';
import type { adminPatchSchema } from './users.schema.js';

/** Impide autoexclusión y pérdida del último admin bajo lock común. */
export async function changeRole(current: Actor, id: string, role: Role) {
  return transaction(async (connection) => {
    await guard.lockAdminGuard(connection);
    const user = await repository.findUser(id, connection);
    if (!user || user.deletedAt) throw new NotFoundError();
    if (id === current.id && role !== 'admin')
      throw new ForbiddenError('No podés quitarte tu rol de administrador.');
    if (
      user.role === 'admin' &&
      role !== 'admin' &&
      user.isActive &&
      (await guard.countActiveAdmins(connection)) <= 1
    )
      throw new ConflictError('Debe quedar al menos un administrador activo.');
    await guard.setRole(id, role, connection);
    await repository.revokeUserSessions(id, connection);
    return publicUser((await repository.findUser(id, connection))!);
  });
}
/** Edita/desactiva o elimina lógicamente preservando invariantes administrativas. */
export async function editAccount(
  current: Actor,
  id: string,
  input: z.infer<typeof adminPatchSchema>,
  deleted = false,
) {
  return transaction(async (connection) => {
    await guard.lockAdminGuard(connection);
    const user = await repository.findUser(id, connection);
    if (!user || user.deletedAt) throw new NotFoundError();
    const active = deleted ? false : (input.isActive ?? Boolean(user.isActive));
    if (id === current.id && !active)
      throw new ForbiddenError('No podés desactivarte ni eliminarte.');
    if (
      user.role === 'admin' &&
      user.isActive &&
      !active &&
      (await guard.countActiveAdmins(connection)) <= 1
    )
      throw new ConflictError('Debe quedar al menos un administrador activo.');
    await repository.updateProfile(
      id,
      {
        firstName: input.firstName ?? user.firstName,
        lastName: input.lastName ?? user.lastName,
        phone: input.phone === undefined ? user.phone : input.phone,
        avatarUrl: input.avatarUrl === undefined ? user.avatarUrl : input.avatarUrl,
      },
      connection,
    );
    await guard.setAccount(
      id,
      input.email ?? user.email,
      active,
      input.canRecordPayments ?? Boolean(user.canRecordPayments),
      deleted,
      connection,
    );
    await repository.revokeUserSessions(id, connection);
    return { updated: true };
  });
}

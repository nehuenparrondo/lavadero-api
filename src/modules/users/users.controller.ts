import type { Request } from 'express';
import type { z } from 'zod';
import { actor, paramId } from '../../utils/http.js';
import * as service from './users.service.js';
import * as admin from './admin.service.js';
import { usersQuerySchema } from './users.schema.js';
import type {
  profileSchema,
  passwordChangeSchema,
  createUserSchema,
  adminPatchSchema,
  roleSchema,
} from './users.schema.js';

/** Devuelve perfil de sesión. */
export function me(r: Request) {
  return service.getProfile(actor(r).id);
}
/** Actualiza perfil propio. */
export function editMe(r: Request) {
  return service.updateOwnProfile(actor(r), r.body as z.infer<typeof profileSchema>);
}
/** Actualiza contraseña propia. */
export function password(r: Request) {
  return service.changePassword(actor(r), r.body as z.infer<typeof passwordChangeSchema>);
}
/** Lista administrativa paginada. */
export function list(r: Request) {
  return service.listUsers(usersQuerySchema.parse(r.query));
}
/** Crea cuenta administrativa. */
export function create(r: Request) {
  return service.createUser(r.body as z.infer<typeof createUserSchema>);
}
/** Consulta individual administrativa. */
export function get(r: Request) {
  return service.getProfile(paramId(r));
}
/** Edita cuenta administrativa. */
export function edit(r: Request) {
  return admin.editAccount(actor(r), paramId(r), r.body as z.infer<typeof adminPatchSchema>);
}
/** Cambia rol bajo guard transaccional. */
export function role(r: Request) {
  return admin.changeRole(actor(r), paramId(r), (r.body as z.infer<typeof roleSchema>).role);
}
/** Borrado lógico administrativo. */
export function remove(r: Request) {
  return admin.editAccount(actor(r), paramId(r), {}, true);
}

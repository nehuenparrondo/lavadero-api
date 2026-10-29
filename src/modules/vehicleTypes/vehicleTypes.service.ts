import * as repo from './vehicleTypes.repository.js';
import { NotFoundError } from '../../errors/NotFoundError.js';
/** Catálogo con booleanos serializables. */
export async function listTypes(admin: boolean) {
  return (await repo.listTypes(admin)).map((v) => ({ ...v, isActive: Boolean(v.isActive) }));
}
/** Alta de tipo. */
export async function createType(v: { code: string; name: string; isActive: boolean }) {
  return { id: await repo.insertType(v), ...v };
}
/** Actualiza tipo y verifica existencia incluso si los valores no cambian. */
export async function editType(
  id: string,
  v: { code: string; name: string; isActive: boolean },
) {
  if (!(await repo.listTypes(true)).some((t) => t.id === id)) throw new NotFoundError();
  await repo.updateType(id, v);
  return { id, ...v };
}
/** Desactiva tipo. */
export async function deleteType(id: string) {
  if (!(await repo.listTypes(true)).some((t) => t.id === id)) throw new NotFoundError();
  await repo.deactivateType(id);
  return { deleted: true };
}

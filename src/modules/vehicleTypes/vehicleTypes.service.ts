import { NotFoundError } from '../../errors/NotFoundError.js';
import * as repo from './vehicleTypes.repository.js';
/** Catálogo con booleanos serializables.
 * @param admin - Valor tipado de admin utilizado por esta operación.
 * @returns `Promise<{ isActive: boolean; constructor: { name: "RowDataPacket"; }; }[]>`, según el contrato de la operación.
 */
export async function listTypes(admin: boolean) {
  return (await repo.listTypes(admin)).map((v) => ({ ...v, isActive: Boolean(v.isActive) }));
}
/** Alta de tipo.
 * @param v - Datos tipados del elemento o formulario que se transforma.
 * @returns `Promise<{ code: string; name: string; isActive: boolean; id: string; }>`, según el contrato de la operación.
 */
export async function createType(v: { code: string; name: string; isActive: boolean }) {
  return { id: await repo.insertType(v), ...v };
}
/** Actualiza tipo y verifica existencia incluso si los valores no cambian.
 * @param id - Identificador del recurso dentro del proyecto actual.
 * @param v - Datos tipados del elemento o formulario que se transforma.
 * @returns `Promise<{ code: string; name: string; isActive: boolean; id: string; }>`, según el contrato de la operación.
 * @throws Error - Cuando no se cumple una precondición indicada en esta operación.
 */
export async function editType(
  id: string,
  v: { code: string; name: string; isActive: boolean },
) {
  if (!(await repo.listTypes(true)).some((t) => t.id === id)) throw new NotFoundError();
  await repo.updateType(id, v);
  return { id, ...v };
}
/** Desactiva tipo.
 * @param id - Identificador del recurso dentro del proyecto actual.
 * @returns `Promise<{ deleted: boolean; }>`, según el contrato de la operación.
 * @throws Error - Cuando no se cumple una precondición indicada en esta operación.
 */
export async function deleteType(id: string) {
  if (!(await repo.listTypes(true)).some((t) => t.id === id)) throw new NotFoundError();
  await repo.deactivateType(id);
  return { deleted: true };
}

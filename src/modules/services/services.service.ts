import type { z } from 'zod';
import { NotFoundError } from '../../errors/NotFoundError.js';
import { serviceSchema } from './services.schema.js';
import type { servicePatchSchema } from './services.schema.js';
import * as repo from './services.repository.js';
/** Retorna catálogo con tarifas por tipo y duración estimada. */
export async function catalog(admin: boolean) {
  const [services, prices] = await Promise.all([repo.listServices(admin), repo.listPrices()]);
  return services.map((s) => ({
    ...s,
    isActive: Boolean(s.isActive),
    prices: prices.filter((p) => p.serviceId === s.id),
  }));
}
/** Crea servicio, aún sin tarifas hasta que admin las cargue. */
export async function createService(input: z.infer<typeof serviceSchema>) {
  return getService(await repo.insertService(input), true);
}
/** Edita y valida un servicio existente. */
export async function editService(id: string, input: z.infer<typeof servicePatchSchema>) {
  const current = await repo.findService(id);
  if (!current) throw new NotFoundError();
  const data = serviceSchema.parse({
    code: current.code,
    name: current.name,
    description: current.description,
    durationMinutes: current.durationMinutes,
    isActive: Boolean(current.isActive),
    ...input,
  });
  await repo.updateService(id, data);
  return getService(id, true);
}
/** Desactiva servicio existente sin afectar precios históricos. */
export async function deleteService(id: string) {
  if (!(await repo.findService(id))) throw new NotFoundError();
  await repo.removeService(id);
  return { deleted: true };
}
/** Cambia tarifa vigente. FK impide un tipo inexistente. */
export async function setPrice(id: string, typeId: string, cents: number) {
  if (!(await repo.findService(id))) throw new NotFoundError();
  await repo.savePrice(id, typeId, cents);
  return { updated: true };
}
/** Detalle de catálogo con la misma proyección normalizada que la lista. */
export async function getService(id: string, admin: boolean) {
  const service = await repo.findService(id);
  if (!service || (!admin && !service.isActive)) throw new NotFoundError();
  return {
    ...service,
    isActive: Boolean(service.isActive),
    prices: (await repo.listPrices()).filter((price) => price.serviceId === id),
  };
}

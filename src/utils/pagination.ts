import { z } from 'zod';

/** Paginación limitada y búsqueda opcional para listas administrativas. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().max(100).default(''),
});
/** Construye metadatos de una lista. */
export function pageResult<T>(items: T[], total: number, page: number, limit: number) {
  return { items, total, page, limit };
}

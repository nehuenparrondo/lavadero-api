import { z } from 'zod';
/** Tipo de vehículo administrable con código estable. */
export const vehicleTypeSchema = z
  .object({
    code: z.string().regex(/^[a-z0-9_-]{2,24}$/u),
    name: z.string().trim().min(1).max(80),
    isActive: z.boolean().default(true),
  })
  .strict();

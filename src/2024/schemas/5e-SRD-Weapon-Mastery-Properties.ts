import { z } from 'zod';

export const WeaponMasteryPropertySchema = z.object({
  index: z.string(),
  name: z.string(),
  description: z.string(),
  url: z.string(),
});

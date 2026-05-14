import { z } from 'zod';

export const WeaponMasteryPropertySchema = z.strictObject({
  index: z.string(),
  name: z.string(),
  description: z.string(),
  url: z.string(),
});

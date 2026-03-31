import { z } from 'zod';

export const DamageTypeSchema = z.object({
  index: z.string(),
  name: z.string(),
  description: z.string(),
  url: z.string(),
});

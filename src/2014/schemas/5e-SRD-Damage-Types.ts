import { z } from 'zod';

export const DamageTypeSchema = z.object({
  index: z.string(),
  name: z.string(),
  desc: z.array(z.string()),
  url: z.string(),
});

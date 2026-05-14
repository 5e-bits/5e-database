import { z } from 'zod';

export const DamageTypeSchema = z.strictObject({
  index: z.string(),
  name: z.string(),
  description: z.string(),
  url: z.string(),
});

import { z } from 'zod';

export const DamageTypeSchema = z.strictObject({
  index: z.string(),
  name: z.string(),
  desc: z.array(z.string()),
  url: z.string(),
});

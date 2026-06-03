import { z } from 'zod';

export const PoisonSchema = z.strictObject({
  index: z.string(),
  name: z.string(),
  cost: z.number(),
  type: z.string(),
  description: z.string(),
  url: z.string(),
});

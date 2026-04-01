import { z } from 'zod';

export const ConditionSchema = z.object({
  index: z.string(),
  name: z.string(),
  description: z.string(),
  url: z.string(),
});

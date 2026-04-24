import { z } from 'zod';

export const ConditionSchema = z.strictObject({
  index: z.string(),
  name: z.string(),
  desc: z.array(z.string()),
  url: z.string(),
});

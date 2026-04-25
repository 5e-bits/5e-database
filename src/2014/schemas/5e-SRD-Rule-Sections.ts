import { z } from 'zod';

export const RuleSectionSchema = z.strictObject({
  index: z.string(),
  name: z.string(),
  desc: z.string(),
  url: z.string(),
});

import { z } from 'zod';

export const RuleSectionSchema = z.object({
  index: z.string(),
  name: z.string(),
  desc: z.string(),
  url: z.string(),
});

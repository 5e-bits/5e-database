import { z } from 'zod';

export const LanguageSchema = z.object({
  index: z.string(),
  name: z.string(),
  is_rare: z.boolean(),
  note: z.string(),
  url: z.string(),
});

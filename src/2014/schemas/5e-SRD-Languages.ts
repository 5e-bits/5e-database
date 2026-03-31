import { z } from 'zod';

export const LanguageSchema = z.object({
  index: z.string(),
  name: z.string(),
  type: z.string(),
  typical_speakers: z.array(z.string()),
  desc: z.string().optional(),
  script: z.string().optional(),
  url: z.string(),
});

import { z } from 'zod';

export const AlignmentSchema = z.object({
  index: z.string(),
  name: z.string(),
  abbreviation: z.string(),
  desc: z.string(),
  url: z.string(),
});

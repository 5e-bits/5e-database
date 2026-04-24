import { z } from 'zod';

export const AlignmentSchema = z.strictObject({
  index: z.string(),
  name: z.string(),
  abbreviation: z.string(),
  description: z.string(),
  url: z.string(),
});

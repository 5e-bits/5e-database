import { z } from 'zod';

export const MagicSchoolSchema = z.object({
  index: z.string(),
  name: z.string(),
  description: z.string(),
  url: z.string(),
});

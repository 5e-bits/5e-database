import { z } from 'zod';

export const MagicSchoolSchema = z.strictObject({
  index: z.string(),
  name: z.string(),
  desc: z.string().optional(),
  url: z.string(),
});

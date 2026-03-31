import { z } from 'zod';
import { APIReferenceSchema } from '../../schemas/common';

export const AbilityScoreSchema = z.object({
  index: z.string(),
  name: z.string(),
  full_name: z.string(),
  description: z.string(),
  skills: z.array(APIReferenceSchema),
  url: z.string(),
});

import { z } from 'zod';
import { APIReferenceSchema } from '../../schemas/common';

export const SkillSchema = z.object({
  index: z.string(),
  name: z.string(),
  description: z.string(),
  ability_score: APIReferenceSchema,
  url: z.string(),
});

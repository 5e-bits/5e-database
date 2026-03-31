import { z } from 'zod';
import { APIReferenceSchema } from '../../schemas/common';

const PrerequisiteSchema = z.object({
  ability_score: APIReferenceSchema.optional(),
  minimum_score: z.number(),
});

export const FeatSchema = z.object({
  index: z.string(),
  name: z.string(),
  prerequisites: z.array(PrerequisiteSchema).optional(),
  desc: z.array(z.string()),
  url: z.string(),
});

import { z } from 'zod';
import { ChoiceSchema } from '../../schemas/common';

const FeatPrerequisitesSchema = z.object({
  minimum_level: z.number().optional(),
  feature_named: z.string().optional(),
});

export const FeatSchema = z.object({
  index: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.string(),
  repeatable: z.string().optional(),
  prerequisites: FeatPrerequisitesSchema.optional(),
  prerequisite_options: ChoiceSchema.optional(),
  url: z.string(),
});

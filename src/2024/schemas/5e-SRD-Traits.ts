import { z } from 'zod';
import { APIReferenceSchema, ChoiceSchema } from '../../schemas/common';

export const TraitSchema = z.object({
  index: z.string(),
  name: z.string(),
  url: z.string(),
  description: z.string(),
  species: z.array(APIReferenceSchema),
  subspecies: z.array(APIReferenceSchema).optional(),
  proficiency_choices: ChoiceSchema.optional(),
  speed: z.number().optional(),
});

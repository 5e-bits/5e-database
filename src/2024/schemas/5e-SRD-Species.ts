import { z } from 'zod';
import { APIReferenceSchema, ChoiceSchema } from '../../schemas/common';

export const SpeciesSchema = z.strictObject({
  index: z.string(),
  name: z.string(),
  url: z.string(),
  type: z.string(),
  size: z.string().optional(),
  size_options: ChoiceSchema.optional(),
  speed: z.number(),
  traits: z.array(APIReferenceSchema).optional(),
  subspecies: z.array(APIReferenceSchema).optional(),
});

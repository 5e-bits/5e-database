import { z } from 'zod';
import { APIReferenceSchema } from '../../schemas/common';

const SubspeciesTraitSchema = z.object({
  index: z.string(),
  name: z.string(),
  url: z.string(),
  level: z.number(),
});

export const SubspeciesSchema = z.object({
  index: z.string(),
  name: z.string(),
  url: z.string(),
  species: APIReferenceSchema,
  traits: z.array(SubspeciesTraitSchema),
  damage_type: APIReferenceSchema.optional(),
});

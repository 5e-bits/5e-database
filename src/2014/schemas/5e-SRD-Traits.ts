import { z } from 'zod';
import { APIReferenceSchema, ChoiceSchema } from '../../schemas/common';

const TraitSpecificSchema = z.object({
  damage_type: APIReferenceSchema.optional(),
}).passthrough();

export const TraitSchema = z.object({
  index: z.string(),
  name: z.string(),
  desc: z.array(z.string()),
  races: z.array(APIReferenceSchema),
  subraces: z.array(APIReferenceSchema),
  proficiencies: z.array(APIReferenceSchema).optional(),
  proficiency_choices: ChoiceSchema.optional(),
  language_options: ChoiceSchema.optional(),
  parent: APIReferenceSchema.optional(),
  trait_specific: TraitSpecificSchema.optional(),
  url: z.string(),
});

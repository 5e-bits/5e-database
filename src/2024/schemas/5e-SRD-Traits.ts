import { z } from 'zod';
import { APIReferenceSchema, ChoiceSchema } from '../../schemas/common';

const SpellTraitSchema = z.strictObject({
  spell: APIReferenceSchema,
  uses: z.string().optional(),
  recovery: z.string().optional(),
});

export const TraitSchema = z.strictObject({
  index: z.string(),
  name: z.string(),
  url: z.string(),
  description: z.string(),
  species: z.array(APIReferenceSchema),
  spells: z.array(SpellTraitSchema).optional(),
  subspecies: z.array(APIReferenceSchema).optional(),
  proficiency_choices: ChoiceSchema.optional(),
  speed: z.number().optional(),
});

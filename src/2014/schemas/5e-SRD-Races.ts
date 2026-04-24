import { z } from 'zod';
import { APIReferenceSchema, ChoiceSchema } from '../../schemas/common';

const AbilityBonusSchema = z.strictObject({
  ability_score: APIReferenceSchema,
  bonus: z.number(),
});

export const RaceSchema = z.strictObject({
  index: z.string(),
  name: z.string(),
  speed: z.number(),
  ability_bonuses: z.array(AbilityBonusSchema),
  ability_bonus_options: ChoiceSchema.optional(),
  alignment: z.string(),
  age: z.string(),
  size: z.string(),
  size_description: z.string(),
  starting_proficiencies: z.array(APIReferenceSchema).optional(),
  starting_proficiency_options: ChoiceSchema.optional(),
  languages: z.array(APIReferenceSchema),
  language_desc: z.string(),
  language_options: ChoiceSchema.optional(),
  traits: z.array(APIReferenceSchema).optional(),
  subraces: z.array(APIReferenceSchema).optional(),
  url: z.string(),
});

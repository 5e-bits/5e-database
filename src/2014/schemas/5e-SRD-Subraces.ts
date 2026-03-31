import { z } from 'zod';
import { APIReferenceSchema } from '../../schemas/common';

const AbilityBonusSchema = z.object({
  ability_score: APIReferenceSchema,
  bonus: z.number(),
});

export const SubraceSchema = z.object({
  index: z.string(),
  name: z.string(),
  race: APIReferenceSchema,
  desc: z.string(),
  ability_bonuses: z.array(AbilityBonusSchema),
  racial_traits: z.array(APIReferenceSchema).optional(),
  url: z.string(),
});

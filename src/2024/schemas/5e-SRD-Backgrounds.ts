import { z } from 'zod';
import { APIReferenceSchema, ChoiceSchema } from '../../schemas/common';

const BackgroundFeatReferenceSchema = z.object({
  index: z.string(),
  name: z.string(),
  url: z.string(),
  note: z.string().optional(),
});

export const BackgroundSchema = z.object({
  index: z.string(),
  name: z.string(),
  ability_scores: z.array(APIReferenceSchema),
  feat: BackgroundFeatReferenceSchema,
  proficiencies: z.array(APIReferenceSchema),
  proficiency_choices: z.array(ChoiceSchema).optional(),
  equipment_options: z.array(ChoiceSchema).optional(),
  url: z.string(),
});

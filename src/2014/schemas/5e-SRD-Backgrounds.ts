import { z } from 'zod';
import { APIReferenceSchema, ChoiceSchema } from '../../schemas/common';

const BackgroundFeatureSchema = z.object({
  name: z.string(),
  desc: z.array(z.string()),
});

const StartingEquipmentSchema = z.object({
  equipment: APIReferenceSchema,
  quantity: z.number(),
});

export const BackgroundSchema = z.object({
  index: z.string(),
  name: z.string(),
  starting_proficiencies: z.array(APIReferenceSchema),
  language_options: ChoiceSchema.optional(),
  starting_equipment: z.array(StartingEquipmentSchema).optional(),
  starting_equipment_options: z.array(ChoiceSchema).optional(),
  feature: BackgroundFeatureSchema.optional(),
  personality_traits: ChoiceSchema.optional(),
  ideals: ChoiceSchema.optional(),
  bonds: ChoiceSchema.optional(),
  flaws: ChoiceSchema.optional(),
  url: z.string(),
});

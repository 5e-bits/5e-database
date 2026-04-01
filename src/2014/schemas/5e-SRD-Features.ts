import { z } from 'zod';
import { APIReferenceSchema, ChoiceSchema } from '../../schemas/common';

const FeatureSpecificSchema = z.strictObject({
  invocations: z.array(APIReferenceSchema).optional(),
  expertise_options: ChoiceSchema.optional(),
  subfeature_options: ChoiceSchema.optional(),
  terrain_type_options: ChoiceSchema.optional(),
  enemy_type_options: ChoiceSchema.optional(),
});

const FeaturePrerequisiteSchema = z.strictObject({
  type: z.string(),
  level: z.number().optional(),
  feature: z.string().optional(),
  spell: z.string().optional(),
});

export const FeatureSchema = z.object({
  index: z.string(),
  name: z.string(),
  level: z.number(),
  class: APIReferenceSchema.optional(),
  subclass: APIReferenceSchema.optional(),
  desc: z.array(z.string()),
  prerequisites: z.array(FeaturePrerequisiteSchema),
  parent: APIReferenceSchema.optional(),
  reference: z.string().optional(),
  feature_specific: FeatureSpecificSchema.optional(),
  url: z.string(),
});

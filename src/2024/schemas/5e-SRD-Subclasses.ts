import { z } from 'zod';
import { APIReferenceSchema } from '../../schemas/common';

const SubclassFeatureSchema = z.strictObject({
  name: z.string(),
  level: z.number(),
  description: z.string(),
});

export const SubclassSchema = z.strictObject({
  index: z.string(),
  url: z.string(),
  name: z.string(),
  class: APIReferenceSchema,
  summary: z.string(),
  description: z.string(),
  features: z.array(SubclassFeatureSchema),
});

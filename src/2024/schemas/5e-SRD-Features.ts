import { z } from 'zod';
import { APIReferenceSchema } from '../../schemas/common';

export const FeatureSchema = z.object({
  index: z.string(),
  name: z.string(),
  description: z.string(),
  level: APIReferenceSchema,
  class: APIReferenceSchema,
  subclass: APIReferenceSchema.optional(),
  url: z.string(),
});

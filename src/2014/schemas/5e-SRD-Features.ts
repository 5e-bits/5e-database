import { z } from 'zod';
import { APIReferenceSchema } from '../../schemas/common';

const FeatureSpecificSchema = z.object({
  invocations: z.array(APIReferenceSchema).optional(),
}).passthrough();

export const FeatureSchema = z.object({
  index: z.string(),
  name: z.string(),
  level: z.number(),
  class: APIReferenceSchema.optional(),
  subclass: APIReferenceSchema.optional(),
  desc: z.array(z.string()),
  prerequisites: z.array(z.object({ type: z.string() }).passthrough()),
  parent: APIReferenceSchema.optional(),
  reference: z.string().optional(),
  feature_specific: FeatureSpecificSchema.optional(),
  url: z.string(),
});

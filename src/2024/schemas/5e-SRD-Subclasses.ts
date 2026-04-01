import { z } from 'zod';

const SubclassFeatureSchema = z.object({
  name: z.string(),
  level: z.number(),
  description: z.string(),
});

export const SubclassSchema = z.object({
  index: z.string(),
  url: z.string(),
  name: z.string(),
  summary: z.string(),
  description: z.string(),
  features: z.array(SubclassFeatureSchema),
});
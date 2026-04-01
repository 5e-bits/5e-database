import { z } from 'zod';
import { APIReferenceSchema } from '../../schemas/common';

export const RuleSchema = z.object({
  index: z.string(),
  name: z.string(),
  desc: z.string(),
  subsections: z.array(APIReferenceSchema),
  url: z.string(),
});

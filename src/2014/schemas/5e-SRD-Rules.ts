import { z } from 'zod';
import { APIReferenceSchema } from '../../schemas/common';

export const RuleSchema = z.strictObject({
  index: z.string(),
  name: z.string(),
  desc: z.string(),
  subsections: z.array(APIReferenceSchema),
  url: z.string(),
});

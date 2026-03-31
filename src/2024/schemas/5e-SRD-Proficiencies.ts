import { z } from 'zod';
import { APIReferenceSchema } from '../../schemas/common';

export const ProficiencySchema = z.object({
  index: z.string(),
  name: z.string(),
  type: z.string(),
  backgrounds: z.array(APIReferenceSchema),
  classes: z.array(APIReferenceSchema),
  reference: APIReferenceSchema.optional(),
  url: z.string(),
});

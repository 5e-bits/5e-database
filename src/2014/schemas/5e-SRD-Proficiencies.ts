import { z } from 'zod';
import { APIReferenceSchema } from '../../schemas/common';

export const ProficiencySchema = z.strictObject({
  index: z.string(),
  name: z.string(),
  type: z.string(),
  classes: z.array(APIReferenceSchema).optional(),
  races: z.array(APIReferenceSchema).optional(),
  reference: APIReferenceSchema,
  url: z.string(),
});

import { z } from 'zod';
import { APIReferenceSchema } from '../../schemas/common';

export const EquipmentCategorySchema = z.strictObject({
  index: z.string(),
  name: z.string(),
  equipment: z.array(APIReferenceSchema),
  url: z.string(),
});

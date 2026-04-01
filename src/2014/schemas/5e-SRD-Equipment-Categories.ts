import { z } from 'zod';
import { APIReferenceSchema } from '../../schemas/common';

export const EquipmentCategorySchema = z.object({
  index: z.string(),
  name: z.string(),
  equipment: z.array(APIReferenceSchema),
  url: z.string(),
});

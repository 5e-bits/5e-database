import { z } from 'zod';
import { APIReferenceSchema } from '../../schemas/common';

const RaritySchema = z.object({
  name: z.string(),
});

export const MagicItemSchema = z.object({
  index: z.string(),
  name: z.string(),
  equipment_category: APIReferenceSchema,
  rarity: RaritySchema,
  variants: z.array(APIReferenceSchema),
  variant: z.boolean(),
  desc: z.array(z.string()).optional(),
  image: z.string().optional(),
  url: z.string(),
});

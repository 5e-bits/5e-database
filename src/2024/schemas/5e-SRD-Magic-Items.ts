import { z } from 'zod';
import { APIReferenceSchema } from '../../schemas/common';

const RaritySchema = z.object({
  name: z.string(),
});

export const MagicItemSchema = z.object({
  name: z.string(),
  index: z.string(),
  url: z.string(),
  image: z.string(),
  equipment_category: APIReferenceSchema,
  variant: z.boolean(),
  variants: z.array(z.unknown()),
  attunement: z.boolean(),
  rarity: RaritySchema,
  desc: z.string(),
  'limited-to': z.string().optional(),
});

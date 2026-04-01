import { z } from 'zod';
import { APIReferenceSchema, DamageSchema, DifficultyClassSchema } from '../../schemas/common';

const CostSchema = z.object({
  quantity: z.number(),
  unit: z.string(),
});

const ArmorClassSchema = z.object({
  base: z.number(),
  dex_bonus: z.boolean(),
  max_bonus: z.number().optional(),
});

const RangeSchema = z.object({
  normal: z.number(),
  long: z.number().optional(),
});

const ThrowRangeSchema = z.object({
  normal: z.number(),
  long: z.number(),
});

const ContentSchema = z.object({
  item: APIReferenceSchema,
  quantity: z.number(),
});

const UtilizeSchema = z.object({
  name: z.string(),
  dc: DifficultyClassSchema,
});

export const EquipmentSchema = z.object({
  index: z.string(),
  name: z.string(),
  equipment_categories: z.array(APIReferenceSchema),
  cost: CostSchema,
  url: z.string(),
  description: z.string().optional(),
  weight: z.number().optional(),
  ammunition: APIReferenceSchema.optional(),
  armor_class: ArmorClassSchema.optional(),
  contents: z.array(ContentSchema).optional(),
  ability: APIReferenceSchema.optional(),
  craft: z.array(APIReferenceSchema).optional(),
  damage: DamageSchema.optional(),
  doff_time: z.string().optional(),
  don_time: z.string().optional(),
  image: z.string().optional(),
  mastery: APIReferenceSchema.optional(),
  notes: z.array(z.string()).optional(),
  properties: z.array(APIReferenceSchema).optional(),
  quantity: z.number().optional(),
  range: RangeSchema.optional(),
  stealth_disadvantage: z.boolean().optional(),
  str_minimum: z.number().optional(),
  throw_range: ThrowRangeSchema.optional(),
  two_handed_damage: DamageSchema.optional(),
  utilize: z.array(UtilizeSchema).optional(),
});

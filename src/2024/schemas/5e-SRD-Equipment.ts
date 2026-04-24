import { z } from 'zod';
import { APIReferenceSchema, DamageSchema, DifficultyClassSchema } from '../../schemas/common';

const CostSchema = z.strictObject({
  quantity: z.number(),
  unit: z.string(),
});

const ArmorClassSchema = z.strictObject({
  base: z.number(),
  dex_bonus: z.boolean(),
  max_bonus: z.number().optional(),
});

const RangeSchema = z.strictObject({
  normal: z.number(),
  long: z.number().optional(),
});

const ThrowRangeSchema = z.strictObject({
  normal: z.number(),
  long: z.number(),
});

const ContentSchema = z.strictObject({
  item: APIReferenceSchema,
  quantity: z.number(),
});

const UtilizeSchema = z.strictObject({
  name: z.string(),
  dc: DifficultyClassSchema,
});

export const EquipmentSchema = z.strictObject({
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
  storage: APIReferenceSchema.optional(),
  range: RangeSchema.optional(),
  stealth_disadvantage: z.boolean().optional(),
  str_minimum: z.number().optional(),
  throw_range: ThrowRangeSchema.optional(),
  two_handed_damage: DamageSchema.optional(),
  utilize: z.array(UtilizeSchema).optional(),
});

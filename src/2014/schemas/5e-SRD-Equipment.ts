import { z } from 'zod';
import { APIReferenceSchema, DamageSchema } from '../../schemas/common';

const CostSchema = z.strictObject({
  quantity: z.number(),
  unit: z.string(),
});

const ArmorClassSchema = z.strictObject({
  base: z.number(),
  dex_bonus: z.boolean(),
  max_bonus: z.number().optional(),
});

const ContentSchema = z.strictObject({
  item: APIReferenceSchema,
  quantity: z.number(),
});

const RangeSchema = z.strictObject({
  normal: z.number(),
  long: z.number().optional(),
});

const ThrowRangeSchema = z.strictObject({
  normal: z.number(),
  long: z.number(),
});

const SpeedSchema = z.strictObject({
  quantity: z.number(),
  unit: z.string(),
});

export const EquipmentSchema = z.strictObject({
  index: z.string(),
  name: z.string(),
  equipment_category: APIReferenceSchema,
  cost: CostSchema,
  url: z.string(),
  desc: z.array(z.string()).optional(),
  weight: z.number().optional(),
  gear_category: APIReferenceSchema.optional(),
  armor_category: z.string().optional(),
  armor_class: ArmorClassSchema.optional(),
  capacity: z.string().optional(),
  category_range: z.string().optional(),
  contents: z.array(ContentSchema).optional(),
  damage: DamageSchema.optional(),
  image: z.string().optional(),
  properties: z.array(APIReferenceSchema).optional(),
  quantity: z.number().optional(),
  range: RangeSchema.optional(),
  special: z.array(z.string()).optional(),
  speed: SpeedSchema.optional(),
  stealth_disadvantage: z.boolean().optional(),
  str_minimum: z.number().optional(),
  throw_range: ThrowRangeSchema.optional(),
  tool_category: z.string().optional(),
  two_handed_damage: DamageSchema.optional(),
  vehicle_category: z.string().optional(),
  weapon_category: z.string().optional(),
  weapon_range: z.string().optional(),
});

import { z } from 'zod';
import { APIReferenceSchema, AreaOfEffectSchema } from '../../schemas/common';

const SpellDamageSchema = z.object({
  damage_type: APIReferenceSchema.optional(),
  damage_at_slot_level: z.record(z.string(), z.string()).optional(),
  damage_at_character_level: z.record(z.string(), z.string()).optional(),
});

const SpellDCSchema = z.object({
  dc_type: APIReferenceSchema,
  dc_success: z.string(),
  desc: z.string().optional(),
});

export const SpellSchema = z.object({
  index: z.string(),
  name: z.string(),
  desc: z.array(z.string()),
  higher_level: z.array(z.string()).optional(),
  range: z.string(),
  components: z.array(z.string()),
  material: z.string().optional(),
  ritual: z.boolean(),
  duration: z.string(),
  concentration: z.boolean(),
  casting_time: z.string(),
  level: z.number(),
  attack_type: z.string().optional(),
  damage: SpellDamageSchema.optional(),
  dc: SpellDCSchema.optional(),
  area_of_effect: AreaOfEffectSchema.optional(),
  heal_at_slot_level: z.record(z.string(), z.string()).optional(),
  school: APIReferenceSchema,
  classes: z.array(APIReferenceSchema),
  subclasses: z.array(APIReferenceSchema).optional(),
  url: z.string(),
});

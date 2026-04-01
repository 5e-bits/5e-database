import { z } from 'zod';

export const APIReferenceSchema = z.object({
  index: z.string(),
  name: z.string(),
  url: z.string(),
  note: z.string().optional(),
});

export const DamageSchema = z.object({
  damage_type: APIReferenceSchema,
  damage_dice: z.string(),
});

export const DifficultyClassSchema = z.object({
  dc_type: APIReferenceSchema,
  dc_value: z.number().optional(),
  success_type: z.enum(['none', 'half', 'other']),
});

export const AreaOfEffectSchema = z.object({
  size: z.number(),
  type: z.enum(['sphere', 'cube', 'cylinder', 'line', 'cone']),
});

export const ChoiceSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    desc: z.string().optional(),
    choose: z.number(),
    type: z.string().optional(),
    from: OptionSetSchema,
  })
);

const OptionSchema: z.ZodType<any> = z.lazy(() =>
  z.union([
    z.strictObject({ option_type: z.literal('reference'), item: APIReferenceSchema }),
    z.strictObject({ option_type: z.literal('choice'), choice: ChoiceSchema }),
    z.strictObject({ option_type: z.literal('string'), string: z.string() }),
    z.strictObject({ option_type: z.literal('ability_bonus'), ability_score: APIReferenceSchema, bonus: z.number() }),
    z.strictObject({ option_type: z.literal('action'), action_name: z.string(), count: z.number(), type: z.string(), desc: z.string().optional() }),
    z.strictObject({ option_type: z.literal('breath'), name: z.string(), dc: DifficultyClassSchema, damage: z.array(DamageSchema).optional() }),
    z.strictObject({ option_type: z.literal('counted_reference'), count: z.number(), of: APIReferenceSchema, prerequisites: z.array(z.strictObject({ type: z.string(), proficiency: APIReferenceSchema.optional() })).optional() }),
    z.strictObject({ option_type: z.literal('damage'), damage_dice: z.string(), damage_type: APIReferenceSchema, notes: z.string().optional() }),
    z.strictObject({ option_type: z.literal('ideal'), alignments: z.array(APIReferenceSchema), desc: z.string() }),
    z.strictObject({ option_type: z.literal('money'), count: z.number(), unit: z.string() }),
    z.strictObject({ option_type: z.literal('multiple'), items: z.array(OptionSchema), desc: z.string().optional() }),
    z.strictObject({ option_type: z.literal('score_prerequisite'), ability_score: APIReferenceSchema, minimum_score: z.number() }),
    z.strictObject({ option_type: z.literal('size'), size: z.string() }),
  ])
);

const OptionSetSchema = z.union([
  z.object({
    option_set_type: z.literal('equipment_category'),
    equipment_category: APIReferenceSchema,
  }),
  z.object({
    option_set_type: z.literal('resource_list'),
    resource_list_url: z.string(),
  }),
  z.object({
    option_set_type: z.literal('options_array'),
    options: z.array(z.union([OptionSchema, z.string()])),
  }),
]);

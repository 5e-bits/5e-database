import { z } from 'zod';

export const APIReferenceSchema = z.object({
  index: z.string(),
  name: z.string(),
  url: z.string(),
});

export const DamageSchema = z.object({
  damage_type: APIReferenceSchema,
  damage_dice: z.string(),
});

export const DifficultyClassSchema = z.object({
  dc_type: APIReferenceSchema,
  dc_value: z.number(),
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
    type: z.string(),
    from: OptionSetSchema,
  })
);

const OptionSchema: z.ZodType<any> = z.lazy(() =>
  z.union([
    z.object({ option_type: z.literal('choice'), choice: ChoiceSchema }),
    z.object({ option_type: z.string() }).passthrough(),
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
    options: z.array(OptionSchema),
  }),
]);

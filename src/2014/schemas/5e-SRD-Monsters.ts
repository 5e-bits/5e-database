import { z } from 'zod';
import { APIReferenceSchema, DamageSchema, DifficultyClassSchema } from '../../schemas/common';

const MonsterSpeedSchema = z.object({
  walk: z.string().optional(),
  burrow: z.string().optional(),
  climb: z.string().optional(),
  fly: z.string().optional(),
  swim: z.string().optional(),
  hover: z.boolean().optional(),
});

const SenseSchema = z.object({
  passive_perception: z.number(),
  blindsight: z.string().optional(),
  darkvision: z.string().optional(),
  tremorsense: z.string().optional(),
  truesight: z.string().optional(),
});

const MonsterProficiencySchema = z.object({
  value: z.number(),
  proficiency: APIReferenceSchema,
});

const MonsterArmorClassSchema = z.object({
  type: z.string(),
  value: z.number(),
}).passthrough();

const ActionUsageSchema = z.object({
  type: z.string(),
  dice: z.string().optional(),
  min_value: z.number().optional(),
});

const MonsterActionSchema = z.object({
  name: z.string(),
  desc: z.string(),
  attack_bonus: z.number().optional(),
  dc: DifficultyClassSchema.optional(),
  usage: ActionUsageSchema.optional(),
}).passthrough();

const LegendaryActionSchema = z.object({
  name: z.string(),
  desc: z.string(),
  attack_bonus: z.number().optional(),
  damage: z.array(DamageSchema).optional(),
  dc: DifficultyClassSchema.optional(),
});

const ReactionSchema = z.object({
  name: z.string(),
  desc: z.string(),
  dc: DifficultyClassSchema.optional(),
});

const SpecialAbilityUsageSchema = z.object({
  type: z.string(),
  times: z.number().optional(),
  rest_types: z.array(z.string()).optional(),
});

const SpecialAbilitySchema = z.object({
  name: z.string(),
  desc: z.string(),
  attack_bonus: z.number().optional(),
  damage: z.array(DamageSchema).optional(),
  dc: DifficultyClassSchema.optional(),
  usage: SpecialAbilityUsageSchema.optional(),
}).passthrough();

export const MonsterSchema = z.object({
  index: z.string(),
  name: z.string(),
  size: z.string(),
  type: z.string(),
  subtype: z.string().optional(),
  alignment: z.string(),
  armor_class: z.array(MonsterArmorClassSchema),
  hit_points: z.number(),
  hit_dice: z.string(),
  hit_points_roll: z.string(),
  speed: MonsterSpeedSchema,
  strength: z.number(),
  dexterity: z.number(),
  constitution: z.number(),
  intelligence: z.number(),
  wisdom: z.number(),
  charisma: z.number(),
  proficiencies: z.array(MonsterProficiencySchema),
  damage_vulnerabilities: z.array(z.string()),
  damage_resistances: z.array(z.string()),
  damage_immunities: z.array(z.string()),
  condition_immunities: z.array(APIReferenceSchema),
  senses: SenseSchema,
  languages: z.string(),
  challenge_rating: z.number(),
  proficiency_bonus: z.number().optional(),
  xp: z.number(),
  special_abilities: z.array(SpecialAbilitySchema).optional(),
  actions: z.array(MonsterActionSchema).optional(),
  legendary_actions: z.array(LegendaryActionSchema).optional(),
  reactions: z.array(ReactionSchema).optional(),
  forms: z.array(APIReferenceSchema).optional(),
  image: z.string().optional(),
  url: z.string(),
});

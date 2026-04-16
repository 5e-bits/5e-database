import { z } from 'zod';
import { APIReferenceSchema, ChoiceSchema, DamageSchema, DifficultyClassSchema } from '../../schemas/common';

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

const MonsterArmorClassSchema = z.strictObject({
  type: z.string(),
  value: z.number(),
  armor: z.array(APIReferenceSchema).optional(),
  condition: APIReferenceSchema.optional(),
  spell: APIReferenceSchema.optional(),
  desc: z.string().optional(),
});

const ActionUsageSchema = z.object({
  type: z.string(),
  dice: z.string().optional(),
  min_value: z.number().optional(),
});

const MonsterActionItemSchema = z.strictObject({
  action_name: z.string(),
  count: z.union([z.number(), z.string()]),
  type: z.string(),
});

const MonsterAttackSchema = z.strictObject({
  name: z.string(),
  dc: DifficultyClassSchema,
  damage: z.array(DamageSchema).optional(),
});

const MonsterActionSchema = z.strictObject({
  name: z.string(),
  desc: z.string(),
  attack_bonus: z.number().optional(),
  dc: DifficultyClassSchema.optional(),
  usage: ActionUsageSchema.optional(),
  multiattack_type: z.string().optional(),
  actions: z.array(MonsterActionItemSchema).optional(),
  action_options: ChoiceSchema.optional(),
  attacks: z.array(MonsterAttackSchema).optional(),
  options: ChoiceSchema.optional(),
  damage: z.array(z.union([DamageSchema, ChoiceSchema])).optional(),
});

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
  time_in_lair: z.number().optional(),
  rest_types: z.array(z.string()).optional(),
});

const SpellcastingSpellUsageSchema = z.strictObject({
  type: z.string(),
  times: z.number().optional(),
});

const SpellcastingSpellSchema = z.strictObject({
  name: z.string(),
  level: z.number(),
  url: z.string(),
  usage: SpellcastingSpellUsageSchema.optional(),
  notes: z.string().optional(),
});

const SpellcastingSchema = z.strictObject({
  ability: APIReferenceSchema,
  components_required: z.array(z.string()),
  spells: z.array(SpellcastingSpellSchema),
  level: z.number().optional(),
  dc: z.number().optional(),
  modifier: z.number().optional(),
  school: z.string().optional(),
  slots: z.record(z.string(), z.number()).optional(),
});

const SpecialAbilitySchema = z.strictObject({
  name: z.string(),
  desc: z.string(),
  attack_bonus: z.number().optional(),
  damage: z.array(DamageSchema).optional(),
  dc: DifficultyClassSchema.optional(),
  usage: SpecialAbilityUsageSchema.optional(),
  spellcasting: SpellcastingSchema.optional(),
});

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
  xp_in_lair: z.number().optional(),
  special_abilities: z.array(SpecialAbilitySchema).optional(),
  actions: z.array(MonsterActionSchema).optional(),
  legendary_actions: z.array(LegendaryActionSchema).optional(),
  reactions: z.array(ReactionSchema).optional(),
  forms: z.array(APIReferenceSchema).optional(),
  image: z.string().optional(),
  url: z.string(),
});

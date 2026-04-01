import { z } from 'zod';
import { APIReferenceSchema } from '../../schemas/common';

const ClassSpecificSchema = z.object({
  action_surges: z.number().optional(),
  arcane_recovery_levels: z.number().optional(),
  aura_range: z.number().optional(),
  bardic_inspiration_die: z.number().optional(),
  brutal_critical_dice: z.number().optional(),
  channel_divinity_charges: z.number().optional(),
  creating_spell_slots: z.array(
    z.object({ sorcery_point_cost: z.number(), spell_slot_level: z.number() })
  ).optional(),
  destroy_undead_cr: z.number().optional(),
  extra_attacks: z.number().optional(),
  favored_enemies: z.number().optional(),
  favored_terrain: z.number().optional(),
  indomitable_uses: z.number().optional(),
  invocations_known: z.number().optional(),
  ki_points: z.number().optional(),
  magical_secrets_max_5: z.number().optional(),
  magical_secrets_max_7: z.number().optional(),
  magical_secrets_max_9: z.number().optional(),
  martial_arts: z.object({ dice_count: z.number(), dice_value: z.number() }).optional(),
  metamagic_known: z.number().optional(),
  mystic_arcanum_level_6: z.number().optional(),
  mystic_arcanum_level_7: z.number().optional(),
  mystic_arcanum_level_8: z.number().optional(),
  mystic_arcanum_level_9: z.number().optional(),
  rage_count: z.number().optional(),
  rage_damage_bonus: z.number().optional(),
  sneak_attack: z.object({ dice_count: z.number(), dice_value: z.number() }).optional(),
  song_of_rest_die: z.number().optional(),
  sorcery_points: z.number().optional(),
  unarmored_movement: z.number().optional(),
  wild_shape_fly: z.boolean().optional(),
  wild_shape_max_cr: z.number().optional(),
  wild_shape_swim: z.boolean().optional(),
});

const LevelSpellcastingSchema = z.object({
  cantrips_known: z.number().optional(),
  spell_slots_level_1: z.number(),
  spell_slots_level_2: z.number(),
  spell_slots_level_3: z.number(),
  spell_slots_level_4: z.number(),
  spell_slots_level_5: z.number(),
  spell_slots_level_6: z.number().optional(),
  spell_slots_level_7: z.number().optional(),
  spell_slots_level_8: z.number().optional(),
  spell_slots_level_9: z.number().optional(),
  spells_known: z.number().optional(),
});

const SubclassSpecificSchema = z.object({
  additional_magical_secrets_max_lvl: z.number().optional(),
  aura_range: z.number().optional(),
});

export const LevelSchema = z.object({
  index: z.string(),
  level: z.number(),
  ability_score_bonuses: z.number().optional(),
  prof_bonus: z.number().optional(),
  features: z.array(APIReferenceSchema).optional(),
  class: APIReferenceSchema,
  class_specific: ClassSpecificSchema.optional(),
  spellcasting: LevelSpellcastingSchema.optional(),
  subclass: APIReferenceSchema.optional(),
  subclass_specific: SubclassSpecificSchema.optional(),
  url: z.string(),
});

import { z } from 'zod';
import { APIReferenceSchema, ChoiceSchema } from '../../schemas/common';

const SpellcastingInfoSchema = z.strictObject({
  name: z.string(),
  desc: z.array(z.string()),
});

const SpellcastingSchema = z.strictObject({
  level: z.number(),
  spellcasting_ability: APIReferenceSchema,
  info: z.array(SpellcastingInfoSchema),
});

const MultiClassingPrereqSchema = z.strictObject({
  ability_score: APIReferenceSchema.optional(),
  minimum_score: z.number(),
});

const MultiClassingSchema = z.strictObject({
  prerequisites: z.array(MultiClassingPrereqSchema).optional(),
  prerequisite_options: ChoiceSchema.optional(),
  proficiencies: z.array(APIReferenceSchema).optional(),
  proficiency_choices: z.array(ChoiceSchema).optional(),
});

const PrimaryAbilitySchema = z.strictObject({
  desc: z.string(),
  ability_scores: z.array(APIReferenceSchema).optional(),
  ability_score_options: ChoiceSchema.optional(),
});

export const ClassSchema = z.strictObject({
  index: z.string(),
  name: z.string(),
  primary_ability: PrimaryAbilitySchema,
  hit_die: z.number(),
  class_levels: z.string(),
  multi_classing: MultiClassingSchema.optional(),
  proficiencies: z.array(APIReferenceSchema).optional(),
  proficiency_choices: z.array(ChoiceSchema),
  saving_throws: z.array(APIReferenceSchema).optional(),
  starting_equipment_options: z.array(ChoiceSchema),
  subclasses: z.array(APIReferenceSchema).optional(),
  spellcasting: SpellcastingSchema.optional(),
  spells: z.string().optional(),
  url: z.string(),
});

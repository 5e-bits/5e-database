import { z } from 'zod';
import { APIReferenceSchema, ChoiceSchema } from '../../schemas/common';

const SpellcastingInfoSchema = z.object({
  name: z.string(),
  desc: z.array(z.string()),
});

const SpellcastingSchema = z.object({
  level: z.number(),
  spellcasting_ability: APIReferenceSchema,
  info: z.array(SpellcastingInfoSchema),
});

const StartingEquipmentSchema = z.object({
  equipment: APIReferenceSchema,
  quantity: z.number(),
});

const MultiClassingPrereqSchema = z.object({
  ability_score: APIReferenceSchema.optional(),
  minimum_score: z.number(),
});

const MultiClassingSchema = z.object({
  prerequisites: z.array(MultiClassingPrereqSchema).optional(),
  prerequisite_options: ChoiceSchema.optional(),
  proficiencies: z.array(APIReferenceSchema).optional(),
  proficiency_choices: z.array(ChoiceSchema).optional(),
});

export const ClassSchema = z.object({
  index: z.string(),
  name: z.string(),
  hit_die: z.number(),
  class_levels: z.string(),
  multi_classing: MultiClassingSchema.optional(),
  proficiencies: z.array(APIReferenceSchema).optional(),
  proficiency_choices: z.array(ChoiceSchema),
  saving_throws: z.array(APIReferenceSchema).optional(),
  starting_equipment: z.array(StartingEquipmentSchema).optional(),
  starting_equipment_options: z.array(ChoiceSchema),
  subclasses: z.array(APIReferenceSchema).optional(),
  spellcasting: SpellcastingSchema.optional(),
  spells: z.string().optional(),
  url: z.string(),
});

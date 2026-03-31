import { describe, it, expect } from 'vitest';
import { z } from 'zod';

import AbilityScores from '../5e-SRD-Ability-Scores.json' with { type: 'json' };
import Alignments from '../5e-SRD-Alignments.json' with { type: 'json' };
import Backgrounds from '../5e-SRD-Backgrounds.json' with { type: 'json' };
import Classes from '../5e-SRD-Classes.json' with { type: 'json' };
import Conditions from '../5e-SRD-Conditions.json' with { type: 'json' };
import DamageTypes from '../5e-SRD-Damage-Types.json' with { type: 'json' };
import EquipmentCategories from '../5e-SRD-Equipment-Categories.json' with { type: 'json' };
import Equipment from '../5e-SRD-Equipment.json' with { type: 'json' };
import Feats from '../5e-SRD-Feats.json' with { type: 'json' };
import Features from '../5e-SRD-Features.json' with { type: 'json' };
import Languages from '../5e-SRD-Languages.json' with { type: 'json' };
import Levels from '../5e-SRD-Levels.json' with { type: 'json' };
import MagicItems from '../5e-SRD-Magic-Items.json' with { type: 'json' };
import MagicSchools from '../5e-SRD-Magic-Schools.json' with { type: 'json' };
import Monsters from '../5e-SRD-Monsters.json' with { type: 'json' };
import Proficiencies from '../5e-SRD-Proficiencies.json' with { type: 'json' };
import Races from '../5e-SRD-Races.json' with { type: 'json' };
import RuleSections from '../5e-SRD-Rule-Sections.json' with { type: 'json' };
import Rules from '../5e-SRD-Rules.json' with { type: 'json' };
import Skills from '../5e-SRD-Skills.json' with { type: 'json' };
import Spells from '../5e-SRD-Spells.json' with { type: 'json' };
import Subclasses from '../5e-SRD-Subclasses.json' with { type: 'json' };
import Subraces from '../5e-SRD-Subraces.json' with { type: 'json' };
import Traits from '../5e-SRD-Traits.json' with { type: 'json' };
import WeaponProperties from '../5e-SRD-Weapon-Properties.json' with { type: 'json' };

import { AbilityScoreSchema } from '../schemas/5e-SRD-Ability-Scores';
import { AlignmentSchema } from '../schemas/5e-SRD-Alignments';
import { BackgroundSchema } from '../schemas/5e-SRD-Backgrounds';
import { ClassSchema } from '../schemas/5e-SRD-Classes';
import { ConditionSchema } from '../schemas/5e-SRD-Conditions';
import { DamageTypeSchema } from '../schemas/5e-SRD-Damage-Types';
import { EquipmentCategorySchema } from '../schemas/5e-SRD-Equipment-Categories';
import { EquipmentSchema } from '../schemas/5e-SRD-Equipment';
import { FeatSchema } from '../schemas/5e-SRD-Feats';
import { FeatureSchema } from '../schemas/5e-SRD-Features';
import { LanguageSchema } from '../schemas/5e-SRD-Languages';
import { LevelSchema } from '../schemas/5e-SRD-Levels';
import { MagicItemSchema } from '../schemas/5e-SRD-Magic-Items';
import { MagicSchoolSchema } from '../schemas/5e-SRD-Magic-Schools';
import { MonsterSchema } from '../schemas/5e-SRD-Monsters';
import { ProficiencySchema } from '../schemas/5e-SRD-Proficiencies';
import { RaceSchema } from '../schemas/5e-SRD-Races';
import { RuleSectionSchema } from '../schemas/5e-SRD-Rule-Sections';
import { RuleSchema } from '../schemas/5e-SRD-Rules';
import { SkillSchema } from '../schemas/5e-SRD-Skills';
import { SpellSchema } from '../schemas/5e-SRD-Spells';
import { SubclassSchema } from '../schemas/5e-SRD-Subclasses';
import { SubraceSchema } from '../schemas/5e-SRD-Subraces';
import { TraitSchema } from '../schemas/5e-SRD-Traits';
import { WeaponPropertySchema } from '../schemas/5e-SRD-Weapon-Properties';

function testAll(data: unknown[], schema: z.ZodTypeAny) {
  for (const item of data as { index?: string; name?: string }[]) {
    const result = schema.safeParse(item);
    expect(result.success, `${item.index ?? item.name}: ${result.error?.message}`).toBe(true);
  }
}

describe('2014 schemas', () => {
  it('ability scores', () => testAll(AbilityScores, AbilityScoreSchema));
  it('alignments', () => testAll(Alignments, AlignmentSchema));
  it('backgrounds', () => testAll(Backgrounds, BackgroundSchema));
  it('classes', () => testAll(Classes, ClassSchema));
  it('conditions', () => testAll(Conditions, ConditionSchema));
  it('damage types', () => testAll(DamageTypes, DamageTypeSchema));
  it('equipment categories', () => testAll(EquipmentCategories, EquipmentCategorySchema));
  it('equipment', () => testAll(Equipment, EquipmentSchema));
  it('feats', () => testAll(Feats, FeatSchema));
  it('features', () => testAll(Features, FeatureSchema));
  it('languages', () => testAll(Languages, LanguageSchema));
  it('levels', () => testAll(Levels, LevelSchema));
  it('magic items', () => testAll(MagicItems, MagicItemSchema));
  it('magic schools', () => testAll(MagicSchools, MagicSchoolSchema));
  it('monsters', () => testAll(Monsters, MonsterSchema));
  it('proficiencies', () => testAll(Proficiencies, ProficiencySchema));
  it('races', () => testAll(Races, RaceSchema));
  it('rule sections', () => testAll(RuleSections, RuleSectionSchema));
  it('rules', () => testAll(Rules, RuleSchema));
  it('skills', () => testAll(Skills, SkillSchema));
  it('spells', () => testAll(Spells, SpellSchema));
  it('subclasses', () => testAll(Subclasses, SubclassSchema));
  it('subraces', () => testAll(Subraces, SubraceSchema));
  it('traits', () => testAll(Traits, TraitSchema));
  it('weapon properties', () => testAll(WeaponProperties, WeaponPropertySchema));
});

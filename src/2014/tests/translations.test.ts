import { z } from 'zod';

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

import { runTranslationTestSuite } from '../../tests/translationTestUtils';

const YEAR_DIR = 'src/2014';

// Maps collection index name → Zod schema. Add entries here when new collections are introduced.
const COLLECTION_SCHEMAS: Record<string, z.ZodTypeAny> = {
  'ability-scores': AbilityScoreSchema,
  alignments: AlignmentSchema,
  backgrounds: BackgroundSchema,
  classes: ClassSchema,
  conditions: ConditionSchema,
  'damage-types': DamageTypeSchema,
  'equipment-categories': EquipmentCategorySchema,
  equipment: EquipmentSchema,
  feats: FeatSchema,
  features: FeatureSchema,
  languages: LanguageSchema,
  levels: LevelSchema,
  'magic-items': MagicItemSchema,
  'magic-schools': MagicSchoolSchema,
  monsters: MonsterSchema,
  proficiencies: ProficiencySchema,
  races: RaceSchema,
  'rule-sections': RuleSectionSchema,
  rules: RuleSchema,
  skills: SkillSchema,
  spells: SpellSchema,
  subclasses: SubclassSchema,
  subraces: SubraceSchema,
  traits: TraitSchema,
  'weapon-properties': WeaponPropertySchema,
};

runTranslationTestSuite('2014 translation files', YEAR_DIR, COLLECTION_SCHEMAS);

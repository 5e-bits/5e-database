import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
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

import { TRANSLATION_SKIP_DIRS } from '../../../scripts/translationUtils';

const YEAR_DIR = 'src/2014';
const EN_DIR = `${YEAR_DIR}/en`;

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

type Entry = Record<string, unknown>;

function getLangDirs(): string[] {
  if (!fs.existsSync(YEAR_DIR)) return [];
  return fs
    .readdirSync(YEAR_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !TRANSLATION_SKIP_DIRS.has(e.name))
    .map((e) => e.name);
}

function collectionNameFromFilename(filename: string): string {
  return filename
    .replace(/^5e-SRD-/, '')
    .replace(/\.json$/, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-');
}

describe('2014 translation files', () => {
  it('should only reference indices that exist in the English source', () => {
    const errors: string[] = [];

    for (const lang of getLangDirs()) {
      const transFiles = globSync(`${YEAR_DIR}/${lang}/5e-SRD-*.json`);

      for (const transFile of transFiles) {
        const filename = path.basename(transFile);
        const enFile = path.join(EN_DIR, filename);

        if (!fs.existsSync(enFile)) {
          errors.push(`${transFile}: no corresponding English source at ${enFile}`);
          continue;
        }

        const enData = JSON.parse(fs.readFileSync(enFile, 'utf8')) as Entry[];
        const transData = JSON.parse(fs.readFileSync(transFile, 'utf8')) as Entry[];
        const enMap = new Map(enData.map((r) => [r.index as string, r]));

        for (const entry of transData) {
          const idx = entry.index as string;
          const enEntry = enMap.get(idx);
          if (!enEntry) {
            errors.push(`${transFile}: index '${idx}' does not exist in English source`);
            continue;
          }

          const { index: _index, ...transFields } = entry;
          for (const field of Object.keys(transFields)) {
            if (!(field in enEntry)) {
              errors.push(
                `${transFile}['${idx}']: field '${field}' does not exist in English entry`
              );
            }
          }
        }
      }
    }

    expect(errors).toEqual([]);
  });

  it('should not contain duplicate indices within a file', () => {
    const errors: string[] = [];

    for (const lang of getLangDirs()) {
      const transFiles = globSync(`${YEAR_DIR}/${lang}/5e-SRD-*.json`);

      for (const transFile of transFiles) {
        const transData = JSON.parse(fs.readFileSync(transFile, 'utf8')) as Entry[];
        const seen = new Set<string>();

        for (const entry of transData) {
          const idx = entry.index as string;
          if (seen.has(idx)) {
            errors.push(`${transFile}: duplicate index '${idx}'`);
          }
          seen.add(idx);
        }
      }
    }

    expect(errors).toEqual([]);
  });

  it('should produce valid documents when merged with the English source', () => {
    const errors: string[] = [];

    for (const lang of getLangDirs()) {
      const transFiles = globSync(`${YEAR_DIR}/${lang}/5e-SRD-*.json`);

      for (const transFile of transFiles) {
        const filename = path.basename(transFile);
        const collectionName = collectionNameFromFilename(filename);
        const schema = COLLECTION_SCHEMAS[collectionName];
        if (!schema) continue;

        const enFile = path.join(EN_DIR, filename);
        if (!fs.existsSync(enFile)) continue;

        const enData = JSON.parse(fs.readFileSync(enFile, 'utf8')) as Entry[];
        const transData = JSON.parse(fs.readFileSync(transFile, 'utf8')) as Entry[];
        const enMap = new Map(enData.map((r) => [r.index as string, r]));

        for (const entry of transData) {
          const idx = entry.index as string;
          const enEntry = enMap.get(idx);
          if (!enEntry) continue;

          const merged = { ...enEntry, ...entry };
          const result = schema.safeParse(merged);
          if (!result.success) {
            errors.push(`${transFile}['${idx}']: ${result.error.message}`);
          }
        }
      }
    }

    expect(errors).toEqual([]);
  });
});

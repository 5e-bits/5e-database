import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
import { z } from 'zod';

import { AbilityScoreSchema } from '../schemas/5e-SRD-Ability-Scores';
import { AlignmentSchema } from '../schemas/5e-SRD-Alignments';
import { BackgroundSchema } from '../schemas/5e-SRD-Backgrounds';
import { ConditionSchema } from '../schemas/5e-SRD-Conditions';
import { DamageTypeSchema } from '../schemas/5e-SRD-Damage-Types';
import { EquipmentCategorySchema } from '../schemas/5e-SRD-Equipment-Categories';
import { EquipmentSchema } from '../schemas/5e-SRD-Equipment';
import { FeatSchema } from '../schemas/5e-SRD-Feats';
import { LanguageSchema } from '../schemas/5e-SRD-Languages';
import { MagicItemSchema } from '../schemas/5e-SRD-Magic-Items';
import { MagicSchoolSchema } from '../schemas/5e-SRD-Magic-Schools';
import { ProficiencySchema } from '../schemas/5e-SRD-Proficiencies';
import { SkillSchema } from '../schemas/5e-SRD-Skills';
import { SpeciesSchema } from '../schemas/5e-SRD-Species';
import { SubclassSchema } from '../schemas/5e-SRD-Subclasses';
import { SubspeciesSchema } from '../schemas/5e-SRD-Subspecies';
import { TraitSchema } from '../schemas/5e-SRD-Traits';
import { WeaponMasteryPropertySchema } from '../schemas/5e-SRD-Weapon-Mastery-Properties';
import { WeaponPropertySchema } from '../schemas/5e-SRD-Weapon-Properties';

const YEAR_DIR = 'src/2024';
const EN_DIR = `${YEAR_DIR}/en`;
const SKIP_DIRS = new Set(['en', 'schemas', 'tests']);

// Maps collection index name → Zod schema. Add entries here when new collections are introduced.
const COLLECTION_SCHEMAS: Record<string, z.ZodTypeAny> = {
  'ability-scores': AbilityScoreSchema,
  'alignments': AlignmentSchema,
  'backgrounds': BackgroundSchema,
  'conditions': ConditionSchema,
  'damage-types': DamageTypeSchema,
  'equipment-categories': EquipmentCategorySchema,
  'equipment': EquipmentSchema,
  'feats': FeatSchema,
  'languages': LanguageSchema,
  'magic-items': MagicItemSchema,
  'magic-schools': MagicSchoolSchema,
  'proficiencies': ProficiencySchema,
  'skills': SkillSchema,
  'species': SpeciesSchema,
  'subclasses': SubclassSchema,
  'subspecies': SubspeciesSchema,
  'traits': TraitSchema,
  'weapon-mastery-properties': WeaponMasteryPropertySchema,
  'weapon-properties': WeaponPropertySchema,
};

type Entry = Record<string, unknown>;

function getLangDirs(): string[] {
  if (!fs.existsSync(YEAR_DIR)) return [];
  return fs.readdirSync(YEAR_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory() && !SKIP_DIRS.has(e.name))
    .map(e => e.name);
}

function collectionNameFromFilename(filename: string): string {
  return filename.replace(/^5e-SRD-/, '').replace(/\.json$/, '').toLowerCase().replace(/[\s_]+/g, '-');
}

describe('2024 translation files', () => {
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
        const enIndices = new Set(enData.map(r => r.index as string));

        for (const entry of transData) {
          const idx = entry.index as string;
          if (!enIndices.has(idx)) {
            errors.push(`${transFile}: index '${idx}' does not exist in English source`);
            continue;
          }

          const enEntry = enData.find(r => r.index === idx)!;
          const { index: _index, ...transFields } = entry;
          for (const field of Object.keys(transFields)) {
            if (!(field in enEntry)) {
              errors.push(`${transFile}['${idx}']: field '${field}' does not exist in English entry`);
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
        const enMap = new Map(enData.map(r => [r.index as string, r]));

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

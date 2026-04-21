import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { globSync } from 'glob';
import { z } from 'zod';
import { LOCALE_PATTERN, TRANSLATION_SKIP_DIRS, getIndexName } from '../../scripts/dbUtils';

type Entry = Record<string, unknown>;

export function getLangDirs(yearDir: string): string[] {
  if (!fs.existsSync(yearDir)) return [];
  return fs
    .readdirSync(yearDir, { withFileTypes: true })
    .filter(
      (e) =>
        e.isDirectory() &&
        LOCALE_PATTERN.test(e.name) &&
        e.name !== 'en' &&
        !TRANSLATION_SKIP_DIRS.has(e.name)
    )
    .map((e) => e.name);
}

export function runTranslationTestSuite(
  suiteName: string,
  yearDir: string,
  collectionSchemas: Record<string, z.ZodTypeAny>
): void {
  const enDir = `${yearDir}/en`;

  describe(suiteName, () => {
    it('should only reference indices that exist in the English source', () => {
      const errors: string[] = [];

      for (const lang of getLangDirs(yearDir)) {
        const transFiles = globSync(`${yearDir}/${lang}/5e-SRD-*.json`);

        for (const transFile of transFiles) {
          const filename = path.basename(transFile);
          const enFile = path.join(enDir, filename);

          if (!fs.existsSync(enFile)) {
            errors.push(`${transFile}: no corresponding English source at ${enFile}`);
            continue;
          }

          const enData = JSON.parse(fs.readFileSync(enFile, 'utf8')) as Entry[];
          const transData = JSON.parse(fs.readFileSync(transFile, 'utf8')) as Entry[];
          const enMap = new Map(enData.map((r) => [r.index as string, r]));

          for (const entry of transData) {
            if (typeof entry.index !== 'string') {
              errors.push(`${transFile}: entry missing required 'index' field`);
              continue;
            }
            const idx = entry.index;
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

      for (const lang of getLangDirs(yearDir)) {
        const transFiles = globSync(`${yearDir}/${lang}/5e-SRD-*.json`);

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

      for (const lang of getLangDirs(yearDir)) {
        const transFiles = globSync(`${yearDir}/${lang}/5e-SRD-*.json`);

        for (const transFile of transFiles) {
          const filename = path.basename(transFile);
          const collectionName = getIndexName(filename);
          if (!collectionName) continue;
          const schema = collectionSchemas[collectionName];
          if (!schema) continue;

          const enFile = path.join(enDir, filename);
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
}

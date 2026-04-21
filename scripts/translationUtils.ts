import { z } from 'zod';
import { LOCALE_PATTERN } from './dbUtils';

export const TRANSLATION_SKIP_DIRS = new Set(['en', 'schemas', 'tests']);

export const TranslationDocumentSchema = z.object({
  source_index: z.string(),
  source_collection: z.string(),
  lang: z.string().regex(LOCALE_PATTERN, 'Must be a BCP 47 language tag'),
  fields: z.record(z.string(), z.unknown()),
  updated_at: z.date(),
});

export interface LocaleDocument {
  lang: string;
  updated_at: Date;
}

export type TranslationDocument = z.infer<typeof TranslationDocumentSchema>;

export function computeLocaleDocuments(translationDocs: TranslationDocument[]): LocaleDocument[] {
  const langs = new Set(translationDocs.map((d) => d.lang));
  return Array.from(langs).map((lang) => ({ lang, updated_at: new Date() }));
}

export function buildEnMap(data: Record<string, unknown>[]): Map<string, Record<string, unknown>> {
  return new Map(
    data.filter((r) => typeof r.index === 'string').map((r) => [r.index as string, r])
  );
}

/**
 * Derives the English source filepath from a locale-nested filepath.
 * e.g., 'src/2014/de/5e-SRD-Spells.json' -> 'src/2014/en/5e-SRD-Spells.json'
 */
export function getEnglishSourcePath(filepath: string): string | null {
  const parts = filepath.split('/');
  const yearIdx = parts.findIndex((p) => /^\d{4}$/.test(p));
  if (yearIdx < 0) return null;
  const result = [...parts];
  result[yearIdx + 1] = 'en';
  return result.join('/');
}

/**
 * Validates a single translation entry against the English source map and
 * builds a TranslationDocument, or returns null if the entry is invalid.
 */
export function buildTranslationDoc(
  transEntry: Record<string, unknown>,
  enMap: Map<string, Record<string, unknown>>,
  sourceCollection: string,
  lang: string
): TranslationDocument | null {
  const sourceIndex = (transEntry as { index?: string }).index;
  if (typeof sourceIndex !== 'string') {
    console.warn(`  Translation entry in ${lang}/${sourceCollection} missing index. Skipping.`);
    return null;
  }

  const enEntry = enMap.get(sourceIndex);
  if (!enEntry) {
    console.warn(
      `  Orphaned translation: ${lang}/${sourceCollection}['${sourceIndex}'] not in English. Skipping.`
    );
    return null;
  }
  const { index: _index, ...rawFields } = transEntry;

  const invalidFields = new Set(Object.keys(rawFields).filter((k) => !(k in enEntry)));
  if (invalidFields.size > 0) {
    console.warn(
      `  Invalid fields in ${lang}/${sourceCollection}['${sourceIndex}']: ${[...invalidFields].join(', ')}. Removing.`
    );
  }

  const translatedFields = Object.fromEntries(
    Object.entries(rawFields).filter(([k]) => !invalidFields.has(k))
  );

  return {
    source_index: sourceIndex,
    source_collection: sourceCollection,
    lang,
    fields: translatedFields,
    updated_at: new Date(),
  };
}

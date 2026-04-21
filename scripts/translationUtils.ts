export interface LocaleDocument {
  lang: string;
  updated_at: Date;
}

export function computeLocaleDocuments(translationDocs: TranslationDocument[]): LocaleDocument[] {
  const langs = new Set(translationDocs.map((d) => d.lang));
  return Array.from(langs).map((lang) => ({ lang, updated_at: new Date() }));
}

export interface TranslationDocument {
  source_index: string;
  source_collection: string;
  lang: string;
  fields: Record<string, unknown>;
  updated_at: Date;
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

  if (!enMap.has(sourceIndex)) {
    console.warn(
      `  Orphaned translation: ${lang}/${sourceCollection}['${sourceIndex}'] not in English. Skipping.`
    );
    return null;
  }

  const enEntry = enMap.get(sourceIndex)!;
  const { index: _index, ...translatedFields } = transEntry;

  const invalidFields = Object.keys(translatedFields).filter((k) => !(k in enEntry));
  if (invalidFields.length > 0) {
    console.warn(
      `  Invalid fields in ${lang}/${sourceCollection}['${sourceIndex}']: ${invalidFields.join(', ')}. Removing.`
    );
    for (const f of invalidFields) delete translatedFields[f];
  }

  return {
    source_index: sourceIndex,
    source_collection: sourceCollection,
    lang,
    fields: translatedFields,
    updated_at: new Date(),
  };
}

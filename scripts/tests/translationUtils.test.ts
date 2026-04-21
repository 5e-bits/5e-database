import { describe, it, expect, vi } from 'vitest';
import {
  buildTranslationDoc,
  computeLocaleDocuments,
  getEnglishSourcePath,
  processTranslationEntries,
  TranslationDocumentSchema,
} from '../translationUtils';

const enMap = new Map([
  ['acid-arrow', { index: 'acid-arrow', name: 'Acid Arrow', desc: ['A spell.'], level: 2 }],
  ['fireball', { index: 'fireball', name: 'Fireball', desc: ['A big spell.'], level: 3 }],
]);

describe('buildTranslationDoc', () => {
  it('returns null when index field is missing', () => {
    const result = buildTranslationDoc({ name: 'Säurepfeil' }, enMap, 'spells', 'de');
    expect(result).toBeNull();
  });

  it('returns null when index does not exist in English source (orphaned)', () => {
    const result = buildTranslationDoc(
      { index: 'nonexistent', name: 'Foo' },
      enMap,
      'spells',
      'de'
    );
    expect(result).toBeNull();
  });

  it('removes fields not present in the English entry', () => {
    const result = buildTranslationDoc(
      { index: 'acid-arrow', name: 'Säurepfeil', bogus_field: 'x' },
      enMap,
      'spells',
      'de'
    );
    expect(result).not.toBeNull();
    expect(result!.fields).not.toHaveProperty('bogus_field');
    expect(result!.fields).toHaveProperty('name', 'Säurepfeil');
  });

  it('returns a valid TranslationDocument for a correct entry', () => {
    const result = buildTranslationDoc(
      { index: 'acid-arrow', name: 'Säurepfeil', desc: ['Ein Zauber.'] },
      enMap,
      'spells',
      'de'
    );
    expect(result).toEqual({
      source_index: 'acid-arrow',
      source_collection: 'spells',
      lang: 'de',
      fields: { name: 'Säurepfeil', desc: ['Ein Zauber.'] },
      updated_at: expect.any(Date),
    });
  });

  it('does not include index in fields', () => {
    const result = buildTranslationDoc(
      { index: 'fireball', name: 'Feuerball' },
      enMap,
      'spells',
      'de'
    );
    expect(result!.fields).not.toHaveProperty('index');
  });

  it('output satisfies TranslationDocumentSchema', () => {
    const result = buildTranslationDoc(
      { index: 'acid-arrow', name: 'Säurepfeil' },
      enMap,
      'spells',
      'de'
    );
    expect(TranslationDocumentSchema.safeParse(result).success).toBe(true);
  });

  it('TranslationDocumentSchema accepts script-subtag locales like zh-Hans', () => {
    const result = buildTranslationDoc(
      { index: 'acid-arrow', name: '酸箭' },
      enMap,
      'spells',
      'zh-Hans'
    );
    expect(TranslationDocumentSchema.safeParse(result).success).toBe(true);
  });
});

describe('computeLocaleDocuments', () => {
  it('returns empty array for no documents', () => {
    expect(computeLocaleDocuments([])).toEqual([]);
  });

  it('returns one document per unique language', () => {
    const docs = [
      {
        source_index: 'a',
        source_collection: 'spells',
        lang: 'de',
        fields: {},
        updated_at: new Date(),
      },
      {
        source_index: 'b',
        source_collection: 'spells',
        lang: 'de',
        fields: {},
        updated_at: new Date(),
      },
      {
        source_index: 'a',
        source_collection: 'spells',
        lang: 'fr',
        fields: {},
        updated_at: new Date(),
      },
    ];
    const result = computeLocaleDocuments(docs);
    expect(result).toHaveLength(2);
    expect(result.map((d) => d.lang).sort()).toEqual(['de', 'fr']);
  });

  it('each result has lang and updated_at', () => {
    const docs = [
      {
        source_index: 'a',
        source_collection: 'spells',
        lang: 'de',
        fields: {},
        updated_at: new Date(),
      },
    ];
    const [result] = computeLocaleDocuments(docs);
    expect(result.lang).toBe('de');
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});

describe('getEnglishSourcePath', () => {
  it('replaces locale dir with en', () => {
    expect(getEnglishSourcePath('src/2014/de/5e-SRD-Spells.json')).toBe(
      'src/2014/en/5e-SRD-Spells.json'
    );
  });

  it('works for region-subtag locales', () => {
    expect(getEnglishSourcePath('src/2024/pt-BR/5e-SRD-Classes.json')).toBe(
      'src/2024/en/5e-SRD-Classes.json'
    );
  });

  it('returns null when no year directory is found', () => {
    expect(getEnglishSourcePath('some/random/path/file.json')).toBeNull();
  });

  it('returns null when the year is immediately followed by a filename (no locale dir)', () => {
    expect(getEnglishSourcePath('src/2024/5e-SRD-Spells.json')).toBeNull();
  });

  it('leaves en paths pointing to en', () => {
    expect(getEnglishSourcePath('src/2014/en/5e-SRD-Spells.json')).toBe(
      'src/2014/en/5e-SRD-Spells.json'
    );
  });
});

describe('processTranslationEntries', () => {
  const enMap = new Map([
    ['acid-arrow', { index: 'acid-arrow', name: 'Acid Arrow', desc: ['A spell.'] }],
    ['fireball', { index: 'fireball', name: 'Fireball', desc: ['A big spell.'] }],
  ]);

  it('returns one doc per valid entry', () => {
    const result = processTranslationEntries(
      [
        { index: 'acid-arrow', name: 'Säurepfeil' },
        { index: 'fireball', name: 'Feuerball' },
      ],
      enMap,
      'spells',
      'de',
      '5e-SRD-Spells.json'
    );
    expect(result).toHaveLength(2);
    expect(result.map((d) => d.source_index)).toEqual(['acid-arrow', 'fireball']);
  });

  it('skips the second occurrence of a duplicate index and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = processTranslationEntries(
      [
        { index: 'acid-arrow', name: 'Säurepfeil' },
        { index: 'acid-arrow', name: 'Duplicate' },
      ],
      enMap,
      'spells',
      'de',
      '5e-SRD-Spells.json'
    );
    expect(result).toHaveLength(1);
    expect(result[0].fields).toHaveProperty('name', 'Säurepfeil');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Duplicate index 'acid-arrow'"));
    warn.mockRestore();
  });

  it('returns empty array for empty input', () => {
    expect(processTranslationEntries([], enMap, 'spells', 'de', '5e-SRD-Spells.json')).toEqual([]);
  });

  it('passes entries without a string index to buildTranslationDoc (which warns and returns null)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = processTranslationEntries(
      [{ name: 'No index here' }],
      enMap,
      'spells',
      'de',
      '5e-SRD-Spells.json'
    );
    expect(result).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

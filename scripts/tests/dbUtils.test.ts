import { describe, it, expect } from 'vitest';
import { getLocaleFromFilepath, LOCALE_PATTERN } from '../dbUtils';

describe('getLocaleFromFilepath', () => {
  it('returns the locale for a standard language code', () => {
    expect(getLocaleFromFilepath('src/2014/de/5e-SRD-Spells.json')).toBe('de');
  });

  it('returns en for English source files', () => {
    expect(getLocaleFromFilepath('src/2014/en/5e-SRD-Spells.json')).toBe('en');
  });

  it('returns null for flat paths with no locale dir', () => {
    expect(getLocaleFromFilepath('src/2014/5e-SRD-Spells.json')).toBeNull();
  });

  it('returns a region-subtag locale like pt-BR', () => {
    expect(getLocaleFromFilepath('src/2024/pt-BR/5e-SRD-Spells.json')).toBe('pt-BR');
  });

  it('returns a numeric-region locale like es-419', () => {
    expect(getLocaleFromFilepath('src/2024/es-419/5e-SRD-Spells.json')).toBe('es-419');
  });

  it('returns null when no year directory is found', () => {
    expect(getLocaleFromFilepath('some/random/path/file.json')).toBeNull();
  });
});

describe('LOCALE_PATTERN', () => {
  it('matches standard 2-letter language codes', () => {
    expect(LOCALE_PATTERN.test('de')).toBe(true);
  });

  it('matches language with uppercase region subtag', () => {
    expect(LOCALE_PATTERN.test('pt-BR')).toBe(true);
  });

  it('matches language with numeric region subtag', () => {
    expect(LOCALE_PATTERN.test('es-419')).toBe(true);
  });

  it('matches language with script subtag', () => {
    expect(LOCALE_PATTERN.test('zh-Hans')).toBe(true);
  });

  it('matches language with script and region subtags', () => {
    expect(LOCALE_PATTERN.test('zh-Hans-CN')).toBe(true);
  });

  it('rejects strings that cannot be BCP 47 language tags', () => {
    expect(LOCALE_PATTERN.test('2014')).toBe(false); // pure numeric (year dir)
    expect(LOCALE_PATTERN.test('a')).toBe(false); // single letter
    expect(LOCALE_PATTERN.test('translations')).toBe(false); // >8 letters
  });

  it('accepts short words that happen to fit BCP 47 language subtag syntax', () => {
    // The full RFC 5646 regex allows 2–8 letter primary language subtags, so common
    // directory names like 'docs', 'tests', 'schemas' pass the pattern.
    // Directory discovery code must exclude known non-locale dirs explicitly.
    expect(LOCALE_PATTERN.test('docs')).toBe(true);
    expect(LOCALE_PATTERN.test('tests')).toBe(true);
    expect(LOCALE_PATTERN.test('schemas')).toBe(true);
  });
});

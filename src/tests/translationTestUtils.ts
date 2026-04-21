import fs from 'fs';
import { LOCALE_PATTERN } from '../../scripts/dbUtils';

export function getLangDirs(yearDir: string): string[] {
  if (!fs.existsSync(yearDir)) return [];
  return fs
    .readdirSync(yearDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && LOCALE_PATTERN.test(e.name) && e.name !== 'en')
    .map((e) => e.name);
}

export function collectionNameFromFilename(filename: string): string {
  return filename
    .replace(/^5e-SRD-/, '')
    .replace(/\.json$/, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '-');
}

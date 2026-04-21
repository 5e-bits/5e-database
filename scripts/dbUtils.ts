import { execSync } from 'child_process';

// --- Constants ---
export const SRD_PREFIX = '5e-SRD-';
export const INDEX_COLLECTION_SUFFIX = 'collections';

// Full RFC 5646 BCP 47 language tag pattern (named groups converted to non-capturing
// because JS forbids duplicate group names even across alternations).
// NOTE: The language subtag allows 2–8 letters, so this regex is syntactically permissive —
// short words like 'docs', 'tests', 'schemas' also match. Use TRANSLATION_SKIP_DIRS
// alongside this to exclude known non-locale project directories.
// prettier-ignore
export const LOCALE_PATTERN =
  /^(?:(?:en-GB-oed|i-ami|i-bnn|i-default|i-enochian|i-hak|i-klingon|i-lux|i-mingo|i-navajo|i-pwn|i-tao|i-tay|i-tsu|sgn-BE-FR|sgn-BE-NL|sgn-CH-DE|art-lojban|cel-gaulish|no-bok|no-nyn|zh-guoyu|zh-hakka|zh-min|zh-min-nan|zh-xiang)|(?:(?:[A-Za-z]{2,3}(?:-[A-Za-z]{3}(?:-[A-Za-z]{3}){0,2})?)|[A-Za-z]{4}|[A-Za-z]{5,8})(?:-[A-Za-z]{4})?(?:-(?:[A-Za-z]{2}|[0-9]{3}))?(?:-(?:[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*(?:-(?:[0-9A-WY-Za-wy-z](?:-[A-Za-z0-9]{2,8})+))*(?:-x(?:-[A-Za-z0-9]{1,8})+)?|x(?:-[A-Za-z0-9]{1,8})+)$/;

// Non-locale directories that live alongside locale dirs in src/{year}/.
// 'en' is the English source and must never be treated as a translation target.
// 'schemas' and 'tests' match the BCP 47 pattern syntactically but are project structure.
export const TRANSLATION_SKIP_DIRS = new Set(['en', 'schemas', 'tests']);

/**
 * Checks if the MONGODB_URI environment variable is set. If not, prints an error
 * message specific to the script being run and exits the process.
 * @param scriptCommand The npm script command name (e.g., 'db:refresh', 'db:update')
 *                      used to provide context in the error message.
 * @returns The MongoDB URI if it is set.
 */
export function checkMongoUri(scriptCommand: string): string {
  const mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri) {
    const localhostUriExample = 'mongodb://localhost/5e-database';
    console.error(
      `MONGODB_URI must be defined before running the script:` +
        `\nOn Apple or Linux:` +
        `\n  $MONGODB_URI=${localhostUriExample} npm run ${scriptCommand}\n` +
        `\nOn Windows:` +
        `\n   PowerShell:` +
        `\n       $env:MONGODB_URI="${localhostUriExample}"; npm run ${scriptCommand}` +
        `\n   CMD prompt:` +
        `\n       set MONGODB_URI=${localhostUriExample} && npm run ${scriptCommand}\n`
    );
    process.exit(1);
  }
  return mongodbUri;
}

/**
 * Extracts the MongoDB collection name from a JSON filepath.
 * Expects the locale-nested structure: src/{year}/{locale}/file.json.
 * Returns null for non-English translation files (locale !== 'en') so the
 * update pipeline skips them — translations require a full dbRefresh.
 * @param filepath The full path to the JSON file.
 * @returns The collection name (e.g., '2014-ability-scores') or null.
 */
export function getCollectionNameFromJsonFile(filepath: string): string | null {
  const parts = filepath.split('/');
  const filename = parts.pop();
  if (!filename) return null;

  const yearIdx = parts.findIndex((p) => /^\d{4}$/.test(p));
  if (yearIdx < 0) return null;

  const localeCandidate = parts[yearIdx + 1];
  if (localeCandidate && LOCALE_PATTERN.test(localeCandidate) && localeCandidate !== 'en') {
    return null; // Non-English translation file — skip in incremental update pipeline
  }

  const match = new RegExp(`\\b${SRD_PREFIX}(.+)\\.json\\b`).exec(filename);
  if (!match) return null;

  const baseCollectionName = match[1].toLowerCase().replace(/[\s_]+/g, '-');
  return `${parts[yearIdx]}-${baseCollectionName}`;
}

/**
 * Determines the collection prefix from a filepath.
 * Expects the locale-nested structure: src/{year}/{locale}/file.json.
 * e.g., 'src/2014/en/file.json' -> '2014-'
 * @param filepath Path to the file.
 * @returns The prefix string (e.g., '2014-') or an empty string.
 */
export function getCollectionPrefix(filepath: string): string {
  const parts = filepath.split('/');
  const yearIdx = parts.findIndex((p) => /^\d{4}$/.test(p));
  return yearIdx >= 0 ? parts[yearIdx] + '-' : '';
}

/**
 * Extracts the BCP 47 locale code from a locale-nested filepath.
 * e.g., 'src/2014/de/5e-SRD-Spells.json' -> 'de'
 *       'src/2014/en/5e-SRD-Spells.json' -> 'en'
 *       'src/2014/5e-SRD-Spells.json'    -> null
 * @param filepath Path to the file.
 * @returns The locale string or null if no locale directory is present.
 */
export function getLocaleFromFilepath(filepath: string): string | null {
  const parts = filepath.split('/');
  const yearIdx = parts.findIndex((p) => /^\d{4}$/.test(p));
  if (yearIdx < 0) return null;
  const localeCandidate = parts[yearIdx + 1];
  if (!localeCandidate || !LOCALE_PATTERN.test(localeCandidate)) return null;
  // Exclude structural dirs that match BCP 47 syntax but are not locales (schemas, tests).
  // 'en' is intentionally allowed — callers use locale === 'en' to detect source files.
  if (localeCandidate === 'schemas' || localeCandidate === 'tests') return null;
  return localeCandidate;
}

/**
 * Extracts the base index name from a JSON filename.
 * Assumes a pattern like '5e-SRD-IndexName.json'.
 * @param filename The filename (e.g., '5e-SRD-Ability-Scores.json').
 * @returns The base index name (e.g., 'ability-scores') or null if the pattern doesn't match.
 */
export function getIndexName(filename: string): string | null {
  const jsonDbCollectionPrefix = SRD_PREFIX;
  const jsonDataPattern = `\\b${jsonDbCollectionPrefix}(.+)\\.json\\b`;
  const regex = new RegExp(jsonDataPattern);
  const match = regex.exec(filename);

  if (!match) return null;

  const dataName = match[1];
  // Convert to lowercase and replace spaces/underscores with hyphens
  return dataName.toLowerCase().replace(/[\s_]+/g, '-');
}

/**
 * Constructs the full name for the index collection based on a prefix.
 * @param prefix The collection prefix (e.g., '2014-').
 * @returns The full index collection name (e.g., '2014-collections').
 */
export function getIndexCollectionName(prefix: string): string {
  return `${prefix}${INDEX_COLLECTION_SUFFIX}`;
}

/**
 * Checks if a command-line tool exists and is executable.
 * @param command The command to check (e.g., 'mongoimport', 'git').
 * @param versionFlag The flag to get the version (e.g., '--version').
 * @returns True if the command executes successfully, false otherwise.
 */
export function checkCommandExists(command: string, versionFlag = '--version'): boolean {
  try {
    execSync(`${command} ${versionFlag}`);
    return true;
  } catch (e) {
    return false;
  }
}

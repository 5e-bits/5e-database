import { execSync } from 'child_process';

// --- Constants ---
export const SRD_PREFIX = '5e-SRD-';
export const INDEX_COLLECTION_SUFFIX = 'collections';

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
 * It assumes a filename pattern like '5e-SRD-CollectionName.json'.
 * It also determines a prefix based on the parent directory (e.g., '2014-' for files in 'src/2014/').
 * @param filepath The full path to the JSON file (e.g., 'src/2014/5e-SRD-Ability-Scores.json').
 * @returns The determined collection name (e.g., '2014-ability-scores') or null if the pattern doesn't match.
 */
export function getCollectionNameFromJsonFile(filepath: string): string | null {
  const parts = filepath.split('/');
  const filename = parts.pop();
  if (!filename) return null;

  // Determine prefix based on parent directory
  let prefix = '';
  if (parts.length > 1) {
    // Check if there is a parent directory besides 'src'
    const parentDir = parts[parts.length - 1];
    // Use the parent directory name, lowercased, plus a hyphen as the prefix
    prefix = parentDir.toLowerCase() + '-';
  }

  // Extract data name from filename
  const jsonDbCollectionPrefix = SRD_PREFIX;
  const jsonDataPattern = `\\b${jsonDbCollectionPrefix}(.+)\\.json\\b`;
  const regex = new RegExp(jsonDataPattern);
  const match = regex.exec(filename);

  if (!match) return null;

  const dataName = match[1];
  // Convert to lowercase and replace spaces/underscores with hyphens
  const baseCollectionName = dataName.toLowerCase().replace(/[\s_]+/g, '-');

  return `${prefix}${baseCollectionName}`;
}

/**
 * Determines the collection prefix based on the directory structure.
 * e.g., 'src/2014/file.json' -> '2014-'
 *       'src/file.json' -> ''
 * @param filepath Path to the file.
 * @returns The prefix string (e.g., '2014-') or an empty string.
 */
export function getCollectionPrefix(filepath: string): string {
  const parts = filepath.split('/');
  // Needs at least 3 parts: 'src', 'subdir', 'filename.json' for a prefix
  if (parts.length >= 3) {
    const parentDir = parts[parts.length - 2]; // Directory containing the file
    if (parentDir && parentDir !== 'src') {
      // Allow any directory under src that isn't src itself to be a prefix
      return parentDir.toLowerCase() + '-';
    }
  }
  return ''; // No prefix if directly in 'src' or structure is unexpected
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

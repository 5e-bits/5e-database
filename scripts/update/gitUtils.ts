import { execSync } from 'child_process';

// Define a type for the file status and path
export type ChangedFile = {
  status: 'A' | 'M' | 'D' | 'R' | 'C' | 'T' | 'U' | 'X' | 'B'; // Git status codes
  filepath: string;
  oldFilepath?: string; // For renames (R)
};

/**
 * Parses the output of `git diff --name-status`.
 * Handles regular status lines (e.g., "M\tpath/to/file.json")
 * and rename lines (e.g., "R100\told/path.json\tnew/path.json").
 * @param output The raw string output from git diff.
 * @returns An array of ChangedFile objects.
 */
function parseNameStatusOutput(output: string): ChangedFile[] {
  return output
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('\t');
      const status = parts[0][0] as ChangedFile['status']; // Take first char of status
      if (status === 'R') {
        return { status, oldFilepath: parts[1], filepath: parts[2] };
      } else {
        return { status, filepath: parts[1] };
      }
    });
}

/**
 * Parses the output of `git ls-files --others` and maps them to Added ('A') status.
 * @param output The raw string output from git ls-files.
 * @returns An array of ChangedFile objects with status 'A'.
 */
function parseLsFilesOutput(output: string): ChangedFile[] {
  return output
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((filepath) => ({ status: 'A', filepath }));
}

/**
 * Gets the list of changed JSON files with their status within the src/ directory
 * comparing the current HEAD to the previous commit (HEAD~1).
 * Includes fallback logic for initial commits or shallow clones.
 * @returns An array of ChangedFile objects.
 */
export function getChangedJsonFilesWithStatus(): ChangedFile[] {
  console.log('Checking for changed JSON files with status in the last commit...');
  let diffOutput: string = '';
  let isFallback = false;

  // 1. Try comparing HEAD vs the previous commit
  try {
    diffOutput = execSync('git diff --name-status -M HEAD~1 HEAD -- src/**/*.json', {
      encoding: 'utf8',
    });
  } catch (error) {
    // Check if the error is due to missing history (e.g., first commit)
    if (error.stderr?.includes('unknown revision or path not in the working tree')) {
      console.warn(
        'Could not find previous commit (HEAD~1). Checking working tree status against index...'
      );
      isFallback = true;
      // 2. If history is missing, try comparing HEAD vs the working tree/index
      try {
        diffOutput = execSync('git diff --name-status -M HEAD -- src/**/*.json', {
          encoding: 'utf8',
        });
      } catch (fallbackError: unknown) {
        console.error('Error diffing working tree against HEAD:', fallbackError);
        throw new Error(
          `Failed to get changed files from git (fallback): ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`
        );
      }
    } else {
      // Re-throw other errors
      console.error('Error diffing HEAD~1..HEAD:', error);
      throw new Error(
        `Failed to get changed files from git: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // 3. Parse the output from the successful diff command
  let changedFiles = parseNameStatusOutput(diffOutput);

  // 4. If the diff was empty (and we potentially used the fallback), check for untracked files.
  // This handles the case of the very first commit where files are added but not yet in HEAD.
  if (changedFiles.length === 0 && isFallback) {
    console.log('No changes found in diff HEAD, checking for untracked files...');
    try {
      const untrackedOutput = execSync(
        'git ls-files --others --exclude-standard -- src/**/*.json',
        { encoding: 'utf8' }
      );
      changedFiles = parseLsFilesOutput(untrackedOutput);
    } catch (untrackedError: unknown) {
      console.error('Error checking for untracked files:', untrackedError);
      throw new Error(
        `Failed to check untracked files: ${untrackedError instanceof Error ? untrackedError.message : String(untrackedError)}`
      );
    }
  }

  return changedFiles;
}

/**
 * Fetches JSON content string of a file from the previous commit (HEAD~1).
 * @param gitPath The path used in the git command (could be old path for renames).
 * @returns A promise resolving to the raw string content, or an empty string on error.
 */
export async function getOldFileContent(gitPath: string): Promise<string> {
  let oldFileContent = '';
  try {
    oldFileContent = execSync(`git show HEAD~1:"${gitPath}"`, { encoding: 'utf8' });
  } catch (err) {
    // Handle errors specific to git show (like file not found in history)
    if (err instanceof Error && err.message?.includes('exists on disk, but not in')) {
      // Expected errors if file was new or unparseable in previous commit
      console.warn(
        `Could not get or parse previous version (HEAD~1:${gitPath}). Assuming all current records are new/modified.`
      );
    } else {
      console.error(`Unexpected error fetching previous version (HEAD~1:${gitPath}):`, err);
      // Depending on policy, might want to re-throw here
    }
    return ''; // Return empty string if content can't be fetched
  }
  // Return the raw content
  return oldFileContent;
}

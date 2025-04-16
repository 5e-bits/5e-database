import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { MongoClient, AnyBulkWriteOperation, Document, Db } from 'mongodb';
// Import utilities
import { checkMongoUri, getCollectionNameFromJsonFile, checkCommandExists } from './dbUtils';

// Use utility to check URI
const mongodbUri = checkMongoUri('db:update');

/**
 * Gets the list of changed JSON files within the src/ directory
 * comparing the current HEAD to the previous commit (HEAD~1).
 * Includes fallback logic for initial commits or shallow clones.
 * @returns An array of file paths.
 */
function getChangedJsonFiles(): string[] {
  console.log('Checking for changed JSON files in the last commit...');
  let changedFiles: string[] = [];
  try {
    const changedFilesOutput = execSync('git diff --name-only HEAD~1 HEAD -- src/**/*.json', {
      encoding: 'utf8',
    });
    changedFiles = changedFilesOutput.trim().split('\n').filter(Boolean);
  } catch (error: any) {
    if (error.stderr?.includes('unknown revision or path not in the working tree')) {
      console.warn(
        'Could not find previous commit (HEAD~1). Checking all JSON files in src/ against index...'
      );
      const stagedUnstagedOutput = execSync('git diff --name-only HEAD -- src/**/*.json', {
        encoding: 'utf8',
      });
      changedFiles = stagedUnstagedOutput.trim().split('\n').filter(Boolean);
      if (!changedFiles.length) {
        const untrackedOutput = execSync(
          'git ls-files --others --exclude-standard -- src/**/*.json',
          { encoding: 'utf8' }
        );
        changedFiles = untrackedOutput.trim().split('\n').filter(Boolean);
      }
    } else {
      console.error('Error fetching changed files from git:', error);
      // Throw the error to be caught by the main function
      throw new Error(`Failed to get changed files from git: ${error.message}`);
    }
  }
  return changedFiles;
}

/**
 * Processes a single JSON file update.
 * Reads the file, parses JSON, determines collection name, and performs
 * a bulk upsert operation in the corresponding MongoDB collection.
 * @param db The MongoDB database instance.
 * @param filepath The path to the JSON file to process.
 */
async function processFileUpdate(db: Db, filepath: string): Promise<void> {
  // Use utility to get collection name based on the full path (handles prefix)
  const collectionName = getCollectionNameFromJsonFile(filepath);

  if (!collectionName) {
    console.warn(`Could not determine collection name for ${filepath}. Skipping.`);
    return; // Skip this file
  }

  console.log(`\nProcessing ${filepath} for collection '${collectionName}'...`);

  try {
    const fileContent = readFileSync(filepath, 'utf8');
    if (!fileContent.trim()) {
      console.warn(`File ${filepath} is empty or contains only whitespace. Skipping.`);
      return;
    }

    const data = JSON.parse(fileContent);
    const collection = db.collection(collectionName);

    if (!Array.isArray(data)) {
      console.warn(`Data in ${filepath} is not a JSON array. Skipping.`);
      return;
    }
    if (data.length === 0) {
      console.log(
        `No records found in ${filepath}. Skipping update for collection '${collectionName}'.`
      );
      return;
    }

    const operations: AnyBulkWriteOperation<Document>[] = [];
    let skippedRecords = 0;
    for (const record of data) {
      const uniqueKey = record.index;
      if (uniqueKey === undefined || uniqueKey === null || uniqueKey === '') {
        console.warn(
          `Record in ${filepath} is missing a valid 'index' field. Cannot update reliably. Skipping record:`,
          JSON.stringify(record).substring(0, 100) + '...'
        );
        skippedRecords++;
        continue;
      }
      operations.push({
        updateOne: {
          filter: { index: uniqueKey },
          update: { $set: { ...record, updated_at: new Date().toISOString() } },
          upsert: true,
        },
      });
    }

    if (operations.length > 0) {
      console.log(
        `Attempting to update/insert ${operations.length} documents in collection '${collectionName}'...`
      );
      const bulkWriteResult = await collection.bulkWrite(operations, { ordered: false });
      console.log(
        `Bulk write completed for collection '${collectionName}': ` +
          `${bulkWriteResult.upsertedCount} upserted, ` +
          `${bulkWriteResult.modifiedCount} modified.`
      );
      if (bulkWriteResult.hasWriteErrors()) {
        console.warn(`Write errors encountered during bulk update for ${collectionName}:`);
        bulkWriteResult
          .getWriteErrors()
          .forEach((err) => console.warn(` - Index ${err.index}: ${err.errmsg}`));
      }
    } else {
      console.log(
        `No valid operations generated for collection '${collectionName}' (skipped ${skippedRecords} records due to missing index).`
      );
    }
    if (skippedRecords > 0) {
      console.warn(
        `Skipped ${skippedRecords} records in ${filepath} due to missing 'index' field.`
      );
    }
  } catch (err: any) {
    if (err instanceof SyntaxError) {
      console.error(`Error parsing JSON in file ${filepath}: ${err.message}. Skipping file.`);
    } else {
      // Log other errors but don't necessarily stop the whole script; allows other files to process.
      console.error(
        `Error processing file ${filepath} or updating collection '${collectionName}':`,
        err
      );
    }
    // Optionally re-throw if certain errors should stop the script: throw err;
  }
}

/**
 * Main function to orchestrate the database update process.
 */
async function main() {
  let client: MongoClient | null = null; // Define client here to access in finally
  try {
    // Get changed files before connecting to DB
    const changedFiles = getChangedJsonFiles();

    if (changedFiles.length === 0) {
      console.log('No relevant JSON files changed in the last commit. No updates needed.');
      return; // Exit early if no files changed
    }

    console.log(`Found ${changedFiles.length} changed JSON files:`);
    changedFiles.forEach((file) => console.log(` - ${file}`));

    // Now connect to MongoDB
    client = new MongoClient(mongodbUri!); // URI is guaranteed non-null by checkMongoUri
    await client.connect();
    console.log('\nConnected successfully to MongoDB server');
    const db = client.db(); // Assumes DB name is part of the URI

    // Process each changed file
    for (const filepath of changedFiles) {
      // Await each file processing individually
      await processFileUpdate(db, filepath);
    }

    console.log('\nDatabase update process finished.');
  } catch (error) {
    // Catch errors from getChangedJsonFiles or DB connection
    console.error('\nDatabase update failed during initialization or file discovery:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('Database connection closed.');
    }
  }
}

// Check if git command exists
if (!checkCommandExists('git')) {
  console.error(
    'Could not execute git command. Make sure git is installed and accessible in your PATH.'
  );
  process.exit(1);
}

main().catch((err) => {
  console.error('Unhandled error in main execution:', err);
  process.exit(1);
});

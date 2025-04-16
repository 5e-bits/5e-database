import { readFileSync } from 'fs';
import { MongoClient, AnyBulkWriteOperation, Document, Db } from 'mongodb';
import { diff } from 'deep-diff';
import { getCollectionNameFromJsonFile } from '../dbUtils'; // Import from parent dir
import { getOldFileContent, ChangedFile } from './gitUtils'; // Import from sibling

// --- Constants for MongoDB Operations ---
const MONGO_OP_UPDATE_ONE = 'updateOne';
const MONGO_OP_DELETE_ONE = 'deleteOne';
const FIELD_UPDATED_AT = 'updated_at';

/**
 * Parses a string containing JSON array content.
 * Handles JSON parsing errors and validates that the result is an array.
 * @param content The raw string content to parse.
 * @param sourceDescription A description of the content's source (e.g., filepath) for logging.
 * @returns The parsed data array, or an empty array if parsing fails or it's not an array.
 */
function parseJsonArrayContent(content: string, sourceDescription: string): any[] {
  if (!content || !content.trim()) {
    console.warn(`Content from ${sourceDescription} is empty or whitespace.`);
    return [];
  }
  try {
    const data = JSON.parse(content);
    if (Array.isArray(data)) {
      return data;
    }
    console.warn(`Data from ${sourceDescription} is not a JSON array. Treating as empty.`);
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error(`Error parsing JSON from ${sourceDescription}: ${err.message}.`);
    } else {
      console.error(`Unexpected error parsing JSON from ${sourceDescription}:`, err);
    }
  }
  return [];
}

/**
 * Reads and parses JSON content from a file path.
 * @param filepath The path to the JSON file.
 * @returns A promise resolving to the parsed data array, or an empty array on error/empty file.
 */
async function readFileContent(filepath: string): Promise<any[]> {
  let fileContent = '';
  try {
    fileContent = readFileSync(filepath, 'utf8');
  } catch (err) {
    console.error(`Error reading file ${filepath}:`, err);
    return [];
  }
  return parseJsonArrayContent(fileContent, filepath);
}

/**
 * Calculates the bulk write operations (upserts/deletes) based on the diff
 * between old and new record arrays.
 * @param oldData Array of records from the old file version.
 * @param currentData Array of records from the current file version.
 * @param filepath Current path of the file (for logging).
 * @returns An object containing the operations array and skipped record count.
 */
function calculateBulkOperations(
  oldData: any[],
  currentData: any[],
  filepath: string
): { operations: AnyBulkWriteOperation<Document>[]; skippedRecords: number } {
  const operations: AnyBulkWriteOperation<Document>[] = [];
  let skippedRecords = 0;

  const oldRecordsMap = new Map(oldData.map((r) => [r.index, r]));
  const newRecordsMap = new Map(currentData.map((r) => [r.index, r]));

  // Find Added/Modified records
  for (const [index, newRecord] of newRecordsMap.entries()) {
    if (index === undefined || index === null || index === '') {
      console.warn(`Record in ${filepath} is missing a valid 'index' field...`);
      skippedRecords++;
      continue;
    }
    const oldRecord = oldRecordsMap.get(index);
    if (!oldRecord || diff(oldRecord, newRecord)) {
      operations.push({
        [MONGO_OP_UPDATE_ONE]: {
          filter: { index: index },
          update: { $set: { ...newRecord, [FIELD_UPDATED_AT]: new Date().toISOString() } },
          upsert: true,
        },
      });
    }
  }

  // Find Deletions
  for (const [index] of oldRecordsMap.entries()) {
    // No need for oldRecord value here
    if (index === undefined || index === null || index === '') continue;
    if (!newRecordsMap.has(index)) {
      console.log(`  - Detected deletion for index: ${index}`);
      operations.push({ [MONGO_OP_DELETE_ONE]: { filter: { index: index } } });
    }
  }

  return { operations, skippedRecords };
}

/**
 * Executes the MongoDB bulk write operation.
 * @param db The MongoDB database instance.
 * @param collectionName The name of the collection to update.
 * @param operations The array of bulk write operations.
 */
async function executeBulkWrite(
  db: Db,
  collectionName: string,
  operations: AnyBulkWriteOperation<Document>[]
): Promise<void> {
  if (operations.length === 0) {
    console.log(`No changes detected for collection '${collectionName}'.`);
    return;
  }

  const upsertCount = operations.filter((op) => MONGO_OP_UPDATE_ONE in op).length;
  const deleteCount = operations.filter((op) => MONGO_OP_DELETE_ONE in op).length;
  console.log(
    `Attempting ${upsertCount} upserts and ${deleteCount} deletions in collection '${collectionName}'...`
  );

  try {
    const collection = db.collection(collectionName);
    const bulkWriteResult = await collection.bulkWrite(operations, { ordered: false });
    console.log(
      `Bulk write completed: ${bulkWriteResult.upsertedCount} upserted, ` +
        `${bulkWriteResult.modifiedCount} modified, ${bulkWriteResult.deletedCount} deleted.`
    );
    if (bulkWriteResult.hasWriteErrors()) {
      console.warn(`Write errors encountered:`);
      bulkWriteResult
        .getWriteErrors()
        .forEach((err) => console.warn(` - Index ${err.index}: ${err.errmsg}`));
    }
  } catch (err) {
    console.error(`Error executing bulk write for collection '${collectionName}':`, err);
  }
}

/**
 * Processes a single JSON file update based on its status (Added, Modified, Renamed).
 * Orchestrates reading files, calculating diffs, and executing DB operations.
 * @param db The MongoDB database instance.
 * @param file The ChangedFile object containing status and path.
 */
export async function processFileUpdate(db: Db, file: ChangedFile): Promise<void> {
  const { status, filepath, oldFilepath } = file;

  if (status !== 'A' && status !== 'M' && status !== 'R') {
    console.log(`\nSkipping file ${filepath} with status ${status}.`);
    return;
  }

  const collectionName = getCollectionNameFromJsonFile(filepath);
  if (!collectionName) {
    console.warn(`Could not determine collection name for ${filepath}. Skipping.`);
    return;
  }

  console.log(`\nProcessing ${filepath} (Status: ${status}) for collection '${collectionName}'...`);

  // Get current content
  const currentData = await readFileContent(filepath);
  // readFileContent handles its own errors and returns [] if failed

  // Get old content if file was modified or renamed
  let oldData: any[] = [];
  if (status === 'M' || status === 'R') {
    const gitPath = status === 'R' && oldFilepath ? oldFilepath : filepath;
    // Fetch raw string content from git
    const oldFileContentString = await getOldFileContent(gitPath);
    // Parse the raw string using the dedicated parser
    oldData = parseJsonArrayContent(oldFileContentString, `HEAD~1:${gitPath}`);
  }

  // Calculate operations based on diff
  const { operations, skippedRecords } = calculateBulkOperations(oldData, currentData, filepath);

  // Execute the bulk write
  await executeBulkWrite(db, collectionName, operations);

  if (skippedRecords > 0) {
    console.warn(`Skipped ${skippedRecords} records in ${filepath} due to missing 'index' field.`);
  }
}

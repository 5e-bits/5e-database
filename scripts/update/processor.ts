import { readFileSync } from 'fs';
import { MongoClient, AnyBulkWriteOperation, Document, Db } from 'mongodb';
import { diff } from 'deep-diff';
import {
  getCollectionNameFromJsonFile,
  getCollectionPrefix,
  getIndexName,
  getIndexCollectionName,
} from '../dbUtils'; // Import from parent dir
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
 * Helper function to update the corresponding index collection.
 * Performs an upsert for additions/renames and a delete for deletions/renames.
 * @param db MongoDB Db instance.
 * @param filepath Path of the file being processed (used to derive index details).
 * @param operationType 'upsert' or 'delete'.
 */
async function updateIndexCollection(
  db: Db,
  filepath: string,
  operationType: 'upsert' | 'delete'
): Promise<void> {
  const filename = filepath.split('/').pop();

  if (!filename) {
    console.warn(`Could not extract filename from ${filepath}. Skipping index update.`);
    return;
  }

  const indexName = getIndexName(filename);
  if (!indexName) {
    // This is expected for files not matching the SRD pattern, like the index collection itself.
    return;
  }

  const collectionPrefix = getCollectionPrefix(filepath);
  const indexCollectionName = getIndexCollectionName(collectionPrefix);
  const indexCollection = db.collection(indexCollectionName);

  try {
    if (operationType === 'upsert') {
      console.log(`Upserting index '${indexName}' into collection '${indexCollectionName}'...`);
      await indexCollection.updateOne(
        { index: indexName },
        { $set: { index: indexName } }, // Simple doc, just the index name
        { upsert: true }
      );
    } else if (operationType === 'delete') {
      console.log(`Deleting index '${indexName}' from collection '${indexCollectionName}'...`);
      await indexCollection.deleteOne({ index: indexName });
    }
  } catch (error) {
    console.error(
      `Error performing ${operationType} for index '${indexName}' in collection '${indexCollectionName}':`,
      error
    );
  }
}

// --- Status-Specific Handlers ---

/**
 * Handles processing for a newly added file.
 * Creates the collection, inserts data, and updates the index collection.
 */
async function _handleFileAdded(db: Db, filepath: string): Promise<void> {
  const collectionName = getCollectionNameFromJsonFile(filepath);
  if (!collectionName) {
    console.warn(`Could not determine collection name for added file ${filepath}. Skipping.`);
    // Even if data processing is skipped, try to update index in case it matches pattern
    await updateIndexCollection(db, filepath, 'upsert');
    return;
  }
  console.log(`\nProcessing Added file ${filepath} for collection '${collectionName}'...`);

  const currentData = await readFileContent(filepath);
  // For added files, oldData is empty
  const { operations, skippedRecords } = calculateBulkOperations([], currentData, filepath);
  await executeBulkWrite(db, collectionName, operations);

  if (skippedRecords > 0) {
    console.warn(`Skipped ${skippedRecords} records in ${filepath} due to missing 'index' field.`);
  }

  // Update index collection
  await updateIndexCollection(db, filepath, 'upsert');
}

/**
 * Handles processing for a modified file.
 * Calculates diff and applies updates/deletes to the existing collection.
 */
async function _handleFileModified(db: Db, filepath: string): Promise<void> {
  const collectionName = getCollectionNameFromJsonFile(filepath);
  if (!collectionName) {
    console.warn(`Could not determine collection name for modified file ${filepath}. Skipping.`);
    return;
  }
  console.log(`\nProcessing Modified file ${filepath} for collection '${collectionName}'...`);

  const currentData = await readFileContent(filepath);
  const oldFileContentString = await getOldFileContent(filepath);
  const oldData = parseJsonArrayContent(oldFileContentString, `HEAD~1:${filepath}`);

  const { operations, skippedRecords } = calculateBulkOperations(oldData, currentData, filepath);
  await executeBulkWrite(db, collectionName, operations);

  if (skippedRecords > 0) {
    console.warn(`Skipped ${skippedRecords} records in ${filepath} due to missing 'index' field.`);
  }
  // No index update needed for modification
}

/**
 * Handles processing for a renamed file.
 * Updates data in the new collection, drops the old collection if name changed,
 * deletes the old index entry, and upserts the new index entry.
 */
async function _handleFileRenamed(db: Db, filepath: string, oldFilepath: string): Promise<void> {
  const collectionName = getCollectionNameFromJsonFile(filepath);
  const oldCollectionName = getCollectionNameFromJsonFile(oldFilepath);

  console.log(
    `\nProcessing Renamed file ${oldFilepath} -> ${filepath} ` +
      `(Collections: ${oldCollectionName || 'N/A'} -> ${collectionName || 'N/A'})...`
  );

  // 1. Update data in the *new* collection (if applicable)
  if (collectionName) {
    const currentData = await readFileContent(filepath);
    const oldFileContentString = await getOldFileContent(oldFilepath); // Get content from OLD git path
    const oldData = parseJsonArrayContent(oldFileContentString, `HEAD~1:${oldFilepath}`);

    const { operations, skippedRecords } = calculateBulkOperations(oldData, currentData, filepath);
    await executeBulkWrite(db, collectionName, operations);

    if (skippedRecords > 0) {
      console.warn(
        `Skipped ${skippedRecords} records in ${filepath} due to missing 'index' field.`
      );
    }
  } else {
    console.warn(`Could not determine new collection name for ${filepath}. Skipping data update.`);
  }

  // 2. Drop the *old* collection if its name was valid and different from the new one
  if (oldCollectionName && oldCollectionName !== collectionName) {
    console.log(`Dropping old collection '${oldCollectionName}' due to rename...`);
    try {
      await db.collection(oldCollectionName).drop();
      console.log(`Dropped old collection '${oldCollectionName}'.`);
    } catch (err) {
      if (err.codeName !== 'NamespaceNotFound') {
        console.error(`Error dropping old collection '${oldCollectionName}' during rename:`, err);
      }
    }
  }

  // 3. Update index collections (delete old, upsert new)
  // First delete the old index entry using the old path
  await updateIndexCollection(db, oldFilepath, 'delete');
  // Then upsert the new index entry using the new path
  await updateIndexCollection(db, filepath, 'upsert');
}

/**
 * Handles processing for a deleted file.
 * Drops the corresponding data collection and deletes the index entry.
 */
async function _handleFileDeleted(db: Db, filepath: string): Promise<void> {
  const collectionName = getCollectionNameFromJsonFile(filepath); // Get name from the path that was deleted
  console.log(`\nProcessing Deletion for ${filepath} (Collection: ${collectionName || 'N/A'})...`);

  // 1. Drop the data collection (if applicable)
  if (collectionName) {
    try {
      await db.collection(collectionName).drop();
      console.log(`Dropped collection '${collectionName}' due to file deletion.`);
    } catch (err) {
      if (err.codeName !== 'NamespaceNotFound') {
        console.error(`Error dropping collection '${collectionName}' for deleted file:`, err);
      } else {
        console.log(`Collection '${collectionName}' not found, likely already dropped.`);
      }
    }
  } else {
    console.warn(
      `Could not determine collection name for deleted file ${filepath}. Cannot drop collection.`
    );
  }

  // 2. Update index collection
  await updateIndexCollection(db, filepath, 'delete');
}

// --- Main Processor Function ---

/**
 * Processes a single JSON file update based on its status (Added, Modified, Renamed, Deleted).
 * Dispatches the file information to the appropriate handler function.
 * @param db The MongoDB database instance.
 * @param file The ChangedFile object containing status and path.
 */
export async function processFileUpdate(db: Db, file: ChangedFile): Promise<void> {
  const { status, filepath, oldFilepath } = file;

  switch (status) {
    case 'A':
      await _handleFileAdded(db, filepath);
      break;
    case 'M':
      await _handleFileModified(db, filepath);
      break;
    case 'R':
      if (!oldFilepath) {
        console.error(
          `Error: Renamed file status 'R' requires 'oldFilepath' for ${filepath}. Skipping.`
        );
        return;
      }
      await _handleFileRenamed(db, filepath, oldFilepath);
      break;
    case 'D':
      await _handleFileDeleted(db, filepath);
      break;
    default:
      console.log(`\nSkipping file ${filepath} with unhandled status ${status}.`);
  }
}

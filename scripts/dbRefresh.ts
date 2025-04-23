import { readdirSync, readFileSync } from 'fs';
import { MongoClient, Collection, Db } from 'mongodb'; // Import MongoClient and types
// Import utilities and constants
import {
  checkMongoUri,
  getCollectionNameFromJsonFile,
  getIndexName,
  getIndexCollectionName,
  SRD_PREFIX,
} from './dbUtils';

// check the environment variable is set
const mongodbUri = checkMongoUri('db:refresh');

// Define type for index collection entries
interface IndexEntry {
  index: string;
}

/**
 * Processes a single JSON file for database refresh.
 * Reads, parses, adds updated_at, drops the collection, and inserts new data.
 * @param db The MongoDB database instance.
 * @param filepath Full path to the JSON file.
 * @param collectionPrefix The prefix for the collection name (e.g., '2014-').
 * @returns The base index name (without prefix) if successful, otherwise null.
 */
async function _processFileForRefresh(
  db: Db,
  filepath: string,
  collectionPrefix: string
): Promise<string | null> {
  const collectionName = getCollectionNameFromJsonFile(filepath);
  const filename = filepath.split('/').pop();

  if (!collectionName || !filename) {
    console.warn(`Could not determine collection or filename for ${filepath}. Skipping.`);
    return null; // Indicate failure/skip
  }

  // Determine the base name for the index table entry using the new util
  const indexName = getIndexName(filename);
  if (indexName === null) {
    // This *shouldn't* happen if getCollectionNameFromJsonFile succeeded and the file has SRD_PREFIX,
    // but handle defensively.
    console.warn(`Could not extract index name from filename ${filename}. Skipping index entry.`);
    // We might still want to process the data, but won't add to index.
    // Decide if we should return null or proceed without adding to index.
    // For now, let's return null as index entry is the main goal here for the caller.
    return null;
  }

  console.log(`Refreshing collection '${collectionName}' from ${filepath}...`);

  let data: any;
  try {
    data = JSON.parse(readFileSync(filepath, 'utf8'));
  } catch (err) {
    console.error(`  Error parsing JSON from ${filepath}:`, err);
    return null; // Indicate failure
  }

  const updatedData = Array.isArray(data)
    ? data.map((record: any) => ({ ...record, updated_at: new Date().toISOString() }))
    : [];

  if (updatedData.length === 0) {
    console.log(`  Skipping collection '${collectionName}' as no data was found or parsed.`);
    // Still return indexName, as the file exists but might be empty
    return indexName;
  }

  const collection: Collection = db.collection(collectionName);

  // Drop the existing collection
  try {
    await collection.drop();
    console.log(`  Dropped existing collection '${collectionName}'.`);
  } catch (err) {
    if (err.codeName !== 'NamespaceNotFound') {
      console.error(`  Error dropping collection '${collectionName}':`, err);
      // Decide if we should stop the whole process - maybe throw here?
      return null; // Indicate failure
    }
  }

  // Insert the new data
  try {
    const insertResult = await collection.insertMany(updatedData);
    console.log(`  Inserted ${insertResult.insertedCount} documents into '${collectionName}'.`);
  } catch (err) {
    console.error(`  Error inserting documents into '${collectionName}':`, err);
    // Decide if we should stop the whole process - maybe throw here?
    return null; // Indicate failure
  }

  return indexName; // Return the base name for the index
}

/**
 * Refreshes the index collection (e.g., '2014-collections') based on processed files.
 * @param db The MongoDB database instance.
 * @param collectionPrefix The prefix for the collection name (e.g., '2014-').
 * @param collections Array of IndexEntry objects.
 */
async function _refreshIndexCollection(
  db: Db,
  collectionPrefix: string,
  collections: IndexEntry[]
): Promise<void> {
  console.log('\nRefreshing index table...');
  const collectionsCollectionName = getIndexCollectionName(collectionPrefix);
  const collectionsCollection: Collection = db.collection(collectionsCollectionName);

  // Drop existing collections table
  try {
    await collectionsCollection.drop();
    console.log(`  Dropped existing collection '${collectionsCollectionName}'.`);
  } catch (err) {
    if (err.codeName !== 'NamespaceNotFound') {
      console.error(`  Error dropping collection '${collectionsCollectionName}':`, err);
      throw err; // Throw if dropping index fails unexpectedly
    }
  }

  // Insert new collections index
  if (collections.length > 0) {
    try {
      // No cast needed now, insertMany accepts compatible objects
      const insertResult = await collectionsCollection.insertMany(collections);
      console.log(
        `  Inserted ${insertResult.insertedCount} documents into '${collectionsCollectionName}'.`
      );
    } catch (err) {
      console.error(`  Error inserting documents into '${collectionsCollectionName}':`, err);
      throw err; // Throw if inserting index fails
    }
  } else {
    console.log(
      `  Skipping creation of collection '${collectionsCollectionName}' as no collections were processed.`
    );
  }
}

// Make the function async to use await
const uploadTablesFromFolder = async (db: Db, jsonDbDir: string, collectionPrefix = '') => {
  const collectionIndexEntries: IndexEntry[] = []; // Use IndexEntry[] type
  let files = [];

  try {
    files = readdirSync(jsonDbDir);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }

  if (files.length === 0) {
    console.error(`no JSON data found in ${jsonDbDir}/`);
    process.exit(1);
  }

  // Use a for...of loop to allow async/await inside
  for (const filename of files) {
    // Basic filter
    if (!filename.includes(SRD_PREFIX) || !filename.endsWith('.json')) {
      continue;
    }

    const filepath = `${jsonDbDir}/${filename}`;
    // Call the helper function to process the file
    const indexName = await _processFileForRefresh(db, filepath, collectionPrefix);
    if (indexName !== null) {
      // If processing was successful (even if file was empty), add index name
      collectionIndexEntries.push({ index: indexName });
    } else {
      // Log or handle the case where processing a file failed critically
      // For now, we assume errors are logged within the helper and we continue
      console.warn(`Critical error processing ${filepath}, it will not be included in the index.`);
    }
  }

  // Make collections table
  await _refreshIndexCollection(db, collectionPrefix, collectionIndexEntries);
};

// Main execution function
async function main() {
  const client = new MongoClient(mongodbUri);
  try {
    await client.connect();
    console.log('Connected successfully to MongoDB server');
    const db = client.db(); // Assumes DB name is in the URI

    console.log('\nUploading 2014 tables...');
    await uploadTablesFromFolder(db, 'src/2014', '2014-');

    console.log('\nUploading 2024 tables...');
    await uploadTablesFromFolder(db, 'src/2024', '2024-');

    // Add calls for other directories if needed, e.g.:
    // console.log('\nUploading root src tables...');
    // await uploadTablesFromFolder(db, 'src/');

    console.log('\nDatabase refresh completed successfully.');
  } catch (error) {
    console.error('\nDatabase refresh failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('MongoDB connection closed.');
  }
}

// Execute main function
main().catch(console.error);

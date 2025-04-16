import { readdirSync, readFileSync } from 'fs';
import { MongoClient, Collection, Db } from 'mongodb'; // Import MongoClient and types
// Import utilities
import { checkMongoUri, getCollectionNameFromJsonFile } from './dbUtils';

// check the environment variable is set
const mongodbUri = checkMongoUri('db:refresh');

// Make the function async to use await
const uploadTablesFromFolder = async (db: Db, jsonDbDir: string, collectionPrefix = '') => {
  const collections: object[] = [];
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
    if (!filename.includes('5e-SRD-') || !filename.endsWith('.json')) {
      continue;
    }

    const filepath = `${jsonDbDir}/${filename}`;
    // Use utility to get collection name based on the full path
    const collectionName = getCollectionNameFromJsonFile(filepath);

    if (!collectionName) {
      console.warn(`Could not determine collection name for ${filepath}. Skipping.`);
      continue; // Skip this file
    }

    // Determine the base name (without the directory prefix) for the index table entry.
    // If a collectionPrefix is provided and the collectionName starts with it,
    // remove the prefix to get the base name. Otherwise, use the full collectionName.
    let indexName = collectionName;
    if (collectionPrefix && collectionName.startsWith(collectionPrefix)) {
      indexName = collectionName.substring(collectionPrefix.length);
    }

    // Store the determined index name (without prefix) for the collections index table.
    collections.push({ index: indexName });

    console.log(`Refreshing collection '${collectionName}' from ${filepath}...`);

    // Read the JSON file
    const data = JSON.parse(readFileSync(filepath, 'utf8'));

    // Add updated_at field to each record
    const updatedData = Array.isArray(data)
      ? data.map((record: any) => ({
          ...record,
          updated_at: new Date().toISOString(),
        }))
      : []; // Ensure updatedData is an array

    if (updatedData.length > 0) {
      const collection: Collection = db.collection(collectionName);

      // Drop the existing collection
      try {
        await collection.drop();
        console.log(`  Dropped existing collection '${collectionName}'.`);
      } catch (err: any) {
        // Ignore error if collection didn't exist (codeName: NamespaceNotFound)
        if (err.codeName !== 'NamespaceNotFound') {
          console.error(`  Error dropping collection '${collectionName}':`, err);
          throw err; // Re-throw other errors
        }
      }

      // Insert the new data
      try {
        const insertResult = await collection.insertMany(updatedData);
        console.log(`  Inserted ${insertResult.insertedCount} documents into '${collectionName}'.`);
      } catch (err) {
        console.error(`  Error inserting documents into '${collectionName}':`, err);
        throw err; // Stop the process if insert fails
      }
    } else {
      console.log(
        `  Skipping collection '${collectionName}' as no data was found or parsed from ${filepath}.`
      );
    }
  }

  // Make collections table
  console.log('creating index table...');
  const collectionsCollectionName = `${collectionPrefix}collections`;
  const collectionsCollection: Collection = db.collection(collectionsCollectionName);

  // Drop existing collections table
  try {
    await collectionsCollection.drop();
    console.log(`  Dropped existing collection '${collectionsCollectionName}'.`);
  } catch (err: any) {
    if (err.codeName !== 'NamespaceNotFound') {
      console.error(`  Error dropping collection '${collectionsCollectionName}':`, err);
      throw err;
    }
  }

  // Insert new collections index
  if (collections.length > 0) {
    try {
      const insertResult = await collectionsCollection.insertMany(collections);
      console.log(
        `  Inserted ${insertResult.insertedCount} documents into '${collectionsCollectionName}'.`
      );
      console.log(collections);
    } catch (err) {
      console.error(`  Error inserting documents into '${collectionsCollectionName}':`, err);
      throw err;
    }
  } else {
    console.log(
      `  Skipping collection '${collectionsCollectionName}' as no collections were processed.`
    );
  }
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

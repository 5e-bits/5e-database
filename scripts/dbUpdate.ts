import { MongoClient } from 'mongodb';
import { checkMongoUri, checkCommandExists } from './dbUtils'; // Shared utils
import { getChangedJsonFilesWithStatus } from './update/gitUtils'; // Git specific utils
import { processFileUpdate } from './update/processor'; // Update processing logic

// --- Initial Checks ---

// Use utility to check URI
const mongodbUri = checkMongoUri('db:update');

// Check if git command exists
if (!checkCommandExists('git')) {
  console.error(
    'Could not execute git command. Make sure git is installed and accessible in your PATH.'
  );
  process.exit(1);
}

// --- Main Execution ---

/**
 * Main function to orchestrate the database update process.
 * Connects to DB, finds changed files via Git, and processes each file update.
 */
async function main() {
  let client: MongoClient | null = null;
  try {
    // 1. Find changed files
    const changedFiles = getChangedJsonFilesWithStatus();

    if (changedFiles.length === 0) {
      console.log('No relevant JSON files changed in the last commit. No updates needed.');
      return;
    }

    console.log(`Found ${changedFiles.length} changed JSON files:`);
    changedFiles.forEach((file) =>
      console.log(
        ` - Status: ${file.status}, Path: ${file.filepath}${file.oldFilepath ? ' (from ' + file.oldFilepath + ')' : ''}`
      )
    );

    // 2. Connect to MongoDB
    client = new MongoClient(mongodbUri);
    await client.connect();
    console.log('\nConnected successfully to MongoDB server');
    const db = client.db();

    // 3. Process each changed file
    for (const file of changedFiles) {
      await processFileUpdate(db, file);
    }

    console.log('\nDatabase update process finished successfully.'); // Success message
  } catch (error) {
    console.error('\nDatabase update process failed:', error);
    process.exit(1);
  } finally {
    // 4. Ensure DB connection is closed
    if (client) {
      await client.close();
      console.log('Database connection closed.');
    }
  }
}

// --- Script Entry Point ---

main().catch((err) => {
  // Catch any unhandled errors from main itself
  console.error('Unhandled error during script execution:', err);
  process.exit(1);
});

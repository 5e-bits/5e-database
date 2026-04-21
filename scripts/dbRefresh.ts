import { readdirSync, readFileSync } from 'fs';
import { MongoClient, Collection, Db, MongoServerError } from 'mongodb';
import {
  checkMongoUri,
  getCollectionNameFromJsonFile,
  getIndexName,
  getIndexCollectionName,
  LOCALE_PATTERN,
  SRD_PREFIX,
} from './dbUtils';
import {
  buildEnMap,
  buildTranslationDoc,
  computeLocaleDocuments,
  TranslationDocument,
} from './translationUtils';

const mongodbUri = checkMongoUri('db:refresh');

interface IndexEntry {
  index: string;
}

async function _processFileForRefresh(
  db: Db,
  filepath: string,
  collectionPrefix: string
): Promise<string | null> {
  const collectionName = getCollectionNameFromJsonFile(filepath);
  const filename = filepath.split('/').pop();

  if (!collectionName || !filename) {
    console.warn(`Could not determine collection or filename for ${filepath}. Skipping.`);
    return null;
  }

  const indexName = getIndexName(filename);
  if (indexName === null) {
    console.warn(`Could not extract index name from filename ${filename}. Skipping index entry.`);
    return null;
  }

  console.log(`Refreshing collection '${collectionName}' from ${filepath}...`);

  let data: any;
  try {
    data = JSON.parse(readFileSync(filepath, 'utf8'));
  } catch (err) {
    console.error(`  Error parsing JSON from ${filepath}:`, err);
    return null;
  }

  const updatedData = Array.isArray(data)
    ? data.map((record: any) => ({ ...record, updated_at: new Date().toISOString() }))
    : [];

  if (updatedData.length === 0) {
    console.log(`  Skipping collection '${collectionName}' as no data was found or parsed.`);
    return indexName;
  }

  const collection: Collection = db.collection(collectionName);

  try {
    await collection.drop();
    console.log(`  Dropped existing collection '${collectionName}'.`);
  } catch (err) {
    if (!(err instanceof MongoServerError && err.codeName === 'NamespaceNotFound')) {
      console.error(`  Error dropping collection '${collectionName}':`, err);
      return null;
    }
  }

  try {
    const insertResult = await collection.insertMany(updatedData);
    console.log(`  Inserted ${insertResult.insertedCount} documents into '${collectionName}'.`);
  } catch (err) {
    console.error(`  Error inserting documents into '${collectionName}':`, err);
    return null;
  }

  return indexName;
}

async function _refreshIndexCollection(
  db: Db,
  collectionPrefix: string,
  collections: IndexEntry[]
): Promise<void> {
  console.log('\nRefreshing index table...');
  const collectionsCollectionName = getIndexCollectionName(collectionPrefix);
  const collectionsCollection: Collection = db.collection(collectionsCollectionName);

  try {
    await collectionsCollection.drop();
    console.log(`  Dropped existing collection '${collectionsCollectionName}'.`);
  } catch (err) {
    if (!(err instanceof MongoServerError && err.codeName === 'NamespaceNotFound')) {
      console.error(`  Error dropping collection '${collectionsCollectionName}':`, err);
      throw err;
    }
  }

  if (collections.length > 0) {
    try {
      const insertResult = await collectionsCollection.insertMany(collections);
      console.log(
        `  Inserted ${insertResult.insertedCount} documents into '${collectionsCollectionName}'.`
      );
    } catch (err) {
      console.error(`  Error inserting documents into '${collectionsCollectionName}':`, err);
      throw err;
    }
  } else {
    console.log(
      `  Skipping creation of collection '${collectionsCollectionName}' as no collections were processed.`
    );
  }
}

const uploadTablesFromFolder = async (db: Db, jsonDbDir: string, collectionPrefix = '') => {
  const collectionIndexEntries: IndexEntry[] = [];
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

  for (const filename of files) {
    if (!filename.includes(SRD_PREFIX) || !filename.endsWith('.json')) {
      continue;
    }

    const filepath = `${jsonDbDir}/${filename}`;
    const indexName = await _processFileForRefresh(db, filepath, collectionPrefix);
    if (indexName !== null) {
      collectionIndexEntries.push({ index: indexName });
    } else {
      console.warn(`Critical error processing ${filepath}, it will not be included in the index.`);
    }
  }

  await _refreshIndexCollection(db, collectionPrefix, collectionIndexEntries);
};

function _processLangDir(lang: string, langDir: string, enDir: string): TranslationDocument[] {
  const docs: TranslationDocument[] = [];
  let langFiles: string[];
  try {
    langFiles = readdirSync(langDir) as string[];
  } catch (e) {
    console.error(`Error reading ${langDir}:`, e);
    return docs;
  }

  for (const filename of langFiles) {
    if (!filename.includes(SRD_PREFIX) || !filename.endsWith('.json')) continue;

    const indexName = getIndexName(filename);
    if (!indexName) continue;

    let enData: Record<string, unknown>[];
    try {
      const raw = JSON.parse(readFileSync(`${enDir}/${filename}`, 'utf8'));
      if (!Array.isArray(raw)) throw new Error('not an array');
      enData = raw;
    } catch {
      console.warn(`  No English source at ${enDir}/${filename}. Skipping ${lang}/${filename}.`);
      continue;
    }

    const enMap = buildEnMap(enData);

    let transData: Record<string, unknown>[];
    try {
      const raw = JSON.parse(readFileSync(`${langDir}/${filename}`, 'utf8'));
      if (!Array.isArray(raw)) throw new Error('not an array');
      transData = raw;
    } catch (err) {
      console.error(`  Error parsing ${langDir}/${filename}:`, err);
      continue;
    }

    console.log(
      `  Processing ${lang} translations for '${indexName}' (${transData.length} entries)...`
    );

    for (const transEntry of transData) {
      const doc = buildTranslationDoc(
        transEntry as Record<string, unknown>,
        enMap,
        indexName,
        lang
      );
      if (doc) docs.push(doc);
    }
  }

  return docs;
}

/**
 * Discovers all non-English locale directories under jsonDbDir, loads their
 * translation JSON files, validates them against the English source, and
 * upserts into `{collectionPrefix}translations`.
 */
async function uploadTranslationsFromFolder(
  db: Db,
  jsonDbDir: string,
  collectionPrefix: string
): Promise<void> {
  const translationCollectionName = `${collectionPrefix}translations`;
  const translationCollection = db.collection(translationCollectionName);

  try {
    await translationCollection.drop();
    console.log(`  Dropped existing collection '${translationCollectionName}'.`);
  } catch (err) {
    if (!(err instanceof MongoServerError && err.codeName === 'NamespaceNotFound')) {
      throw err;
    }
  }

  let langDirs: string[];
  try {
    langDirs = readdirSync(jsonDbDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && LOCALE_PATTERN.test(e.name) && e.name !== 'en')
      .map((e) => e.name);
  } catch (e) {
    console.error(`Error reading ${jsonDbDir}:`, e);
    return;
  }

  if (langDirs.length === 0) {
    console.log(`  No translation directories found in ${jsonDbDir}.`);
    return;
  }

  console.log(`  Found translation languages: ${langDirs.join(', ')}`);
  const translationDocs: TranslationDocument[] = [];

  for (const lang of langDirs) {
    const docs = _processLangDir(lang, `${jsonDbDir}/${lang}`, `${jsonDbDir}/en`);
    translationDocs.push(...docs);
  }

  if (translationDocs.length > 0) {
    await translationCollection.createIndex(
      { source_collection: 1, source_index: 1, lang: 1 },
      { unique: true }
    );
    const result = await translationCollection.insertMany(translationDocs);
    console.log(
      `  Inserted ${result.insertedCount} documents into '${translationCollectionName}'.`
    );
  } else {
    console.log(`  No translation documents to insert into '${translationCollectionName}'.`);
  }

  await _refreshLocaleCollection(db, collectionPrefix, translationDocs);
}

async function _refreshLocaleCollection(
  db: Db,
  collectionPrefix: string,
  translationDocs: TranslationDocument[]
): Promise<void> {
  const localeCollectionName = `${collectionPrefix}locales`;
  const localeCollection = db.collection(localeCollectionName);

  try {
    await localeCollection.drop();
  } catch (err) {
    if (!(err instanceof MongoServerError && err.codeName === 'NamespaceNotFound')) throw err;
  }

  const localeDocs = computeLocaleDocuments(translationDocs);
  if (localeDocs.length > 0) {
    await localeCollection.createIndex({ lang: 1 }, { unique: true });
    await localeCollection.insertMany(localeDocs);
    console.log(`  Inserted ${localeDocs.length} locale documents into '${localeCollectionName}'.`);
  } else {
    console.log(`  No locales to insert into '${localeCollectionName}'.`);
  }
}

async function main() {
  const client = new MongoClient(mongodbUri);
  try {
    await client.connect();
    console.log('Connected successfully to MongoDB server');
    const db = client.db();

    console.log('\nUploading 2014 tables...');
    await uploadTablesFromFolder(db, 'src/2014/en', '2014-');
    console.log('\nLoading 2014 translations...');
    await uploadTranslationsFromFolder(db, 'src/2014', '2014-');

    console.log('\nUploading 2024 tables...');
    await uploadTablesFromFolder(db, 'src/2024/en', '2024-');
    console.log('\nLoading 2024 translations...');
    await uploadTranslationsFromFolder(db, 'src/2024', '2024-');

    console.log('\nDatabase refresh completed successfully.');
  } catch (error) {
    console.error('\nDatabase refresh failed:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('MongoDB connection closed.');
  }
}

main().catch(console.error);

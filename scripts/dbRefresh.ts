import { readdirSync, unlinkSync, writeFileSync } from 'fs';

import { execSync } from 'child_process';

// check the environment variable is set
const mongodbUri = process.env.MONGODB_URI;
if (mongodbUri === undefined) {
  const localhostUriExample = 'mongodb://localhost/5e-database';
  console.error(
    'MONGODB_URI must be defined before running the script:' +
      '\nOn Apple or Linux:' +
      `\n  $MONGODB_URI=${localhostUriExample} npm run db:refresh\n` +
      '\nOn Windows:' +
      '\n   PowerShell:' +
      `\n       $env:MONGODB_URI="${localhostUriExample}"; npm run db:refresh` +
      '\n   CMD prompt:' +
      `\n       set MONGODB_URI=${localhostUriExample} && npm run db:refresh\n`
  );
  process.exit(1);
}

// check mongoimport can be found and executed
try {
  execSync('mongoimport --version');
} catch (e) {
  console.error(
    'could not execute mongoimport - make sure the directory containing mongoimport is visible in your $PATH environment variable'
  );
  process.exit(1);
}

const uploadTablesFromFolder = (jsonDbDir: string, collectionPrefix = '') => {
  const collections: object[] = [];
  const jsonDbCollectionPrefix = '5e-SRD-';
  const jsonDataPattern = `\\b${jsonDbCollectionPrefix}(.+)\\.json\\b`;
  const regex = new RegExp(jsonDataPattern);
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

  files
    .filter((filename) => regex.test(filename))
    .forEach((filename) => {
      const filepath = `${jsonDbDir}/${filename}`;
      const match = regex.exec(filename)!;
      const dataName = match[1];
      const collectionName = `${collectionPrefix}${dataName.toLowerCase()}`;
      collections.push({ index: collectionName });
      // example:
      // mongoimport --uri mongodb://localhost/5e-database
      //             --collection ability-scores
      //             --file src/5e-SRD-Ability-Scores.json
      //             --jsonArray
      //             --drop
      console.log(`importing ${dataName}...`);
      const exec_string =
        `mongoimport --uri ${mongodbUri}` +
        ` --collection ${collectionName}` +
        ` --file ${filepath}` +
        ' --jsonArray' +
        ' --drop';
      execSync(exec_string);
    });
  return collections;
};

console.log('uploading 2014 tables...');
const collections: object[] = [];
collections.push(...uploadTablesFromFolder('src/2014', '2014-'));

// Make collections table
console.log('creating index table...');
const filepath = 'src/collections.json';
writeFileSync(filepath, JSON.stringify(collections, null, 2), 'utf8');
const exec_string =
  `mongoimport --uri ${mongodbUri}` +
  ' --collection collections' +
  ` --file ${filepath}` +
  ' --jsonArray' +
  ' --drop';
console.log(collections);
execSync(exec_string);
unlinkSync(filepath);

import { readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';

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
      collections.push({ index: dataName.toLowerCase() });
      // example:
      // mongoimport --uri mongodb://localhost/5e-database
      //             --collection ability-scores
      //             --file src/5e-SRD-Ability-Scores.json
      //             --jsonArray
      //             --drop
      console.log(`importing ${dataName}...`);

      // Read the JSON file
      const data = JSON.parse(readFileSync(filepath, 'utf8'));

      // Add updated_at field to each record
      const updatedData = data.map((record: any) => ({
        ...record,
        updated_at: new Date().toISOString(),
      }));

      // Write the modified data to a temporary file
      const tempFilepath = `${jsonDbDir}/temp-${filename}`;
      writeFileSync(tempFilepath, JSON.stringify(updatedData, null, 2), 'utf8');

      const exec_string =
        `mongoimport --uri ${mongodbUri}` +
        ` --collection ${collectionName}` +
        ` --file ${tempFilepath}` +
        ' --jsonArray' +
        ' --drop';
      execSync(exec_string);

      // Remove the temporary file
      unlinkSync(tempFilepath);
    });

  // Make collections table
  console.log('creating index table...');
  const filepath = 'src/collections.json';
  writeFileSync(filepath, JSON.stringify(collections, null, 2), 'utf8');
  const exec_string =
    `mongoimport --uri ${mongodbUri}` +
    ` --collection  ${collectionPrefix}collections` +
    ` --file ${filepath}` +
    ' --jsonArray' +
    ' --drop';
  console.log(collections);
  execSync(exec_string);
  unlinkSync(filepath);
};

console.log('uploading 2014 tables...');
uploadTablesFromFolder('src/2014', '2014-');

// TODO: DEPRECATED
console.log('uploading original tables...');
uploadTablesFromFolder('src/2014');

import { readdirSync, unlinkSync, writeFileSync } from "fs";

import { execSync } from "child_process";

// check the environment variable is set
const mongodb_uri = process.env.MONGODB_URI;
if (mongodb_uri === undefined) {
  const localhost_uri_example = "mongodb://localhost/5e-database";
  console.error(
    "MONGODB_URI must be defined before running the script:" +
      "\nOn Apple or Linux:" +
      `\n  $MONGODB_URI=${localhost_uri_example} npm run db:refresh\n` +
      "\nOn Windows:" +
      "\n   PowerShell:" +
      `\n       $env:MONGODB_URI="${localhost_uri_example}"; npm run db:refresh` +
      "\n   CMD prompt:" +
      `\n       set MONGODB_URI=${localhost_uri_example} && npm run db:refresh\n`
  );
  process.exit(1);
}

// check mongoimport can be found and executed
try {
  execSync("mongoimport --version");
} catch (e) {
  console.error(
    "could not execute mongoimport - make sure the directory containing mongoimport is visible in your $PATH environment variable"
  );
  process.exit(1);
}

const json_db_dir = "src";
const json_db_collection_prefix = "5e-SRD-";
const json_data_pattern = `\\b${json_db_collection_prefix}(.+)\\.json\\b`;

const regex = new RegExp(json_data_pattern);
let files = [];

try {
  files = readdirSync(json_db_dir);
} catch (e) {
  console.error(e);
  process.exit(1);
}

if (files.length === 0) {
  console.error(`no JSON data found in ${json_db_dir}/`);
  process.exit(1);
}

const collections: object[] = [];
files
  .filter((filename) => regex.test(filename))
  .forEach((filename) => {
    const filepath = `${json_db_dir}/${filename}`;
    const match = regex.exec(filename)!;
    const data_name = match[1];
    const collection_name = data_name.toLowerCase();
    collections.push({ index: collection_name });
    // example:
    // mongoimport --uri mongodb://localhost/5e-database
    //             --collection ability-scores
    //             --file src/5e-SRD-Ability-Scores.json
    //             --jsonArray
    //             --drop
    console.log(`importing ${data_name}...`);
    const exec_string =
      `mongoimport --uri ${mongodb_uri}` +
      ` --collection ${collection_name}` +
      ` --file ${filepath}` +
      " --jsonArray" +
      " --drop";
    execSync(exec_string);
  });

// Make collections table
console.log("creating index table...");
const filepath = "src/collections.json";
writeFileSync(filepath, JSON.stringify(collections, null, 2), "utf8");
const exec_string =
  `mongoimport --uri ${mongodb_uri}` +
  " --collection collections" +
  ` --file ${filepath}` +
  " --jsonArray" +
  " --drop";
console.log(collections);
execSync(exec_string);
unlinkSync(filepath);

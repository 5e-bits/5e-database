import { describe, it, expect } from 'vitest';
import fs from 'fs';
import { globSync } from 'glob';

type Entry = Record<string, unknown>;

describe('duplicate indices', () => {
  it('should contain unique indices', () => {
    const errors: string[] = [];
    const fileIndices: Record<string, Set<unknown>> = {};

    forEachFileEntry((filename, entry) => {
      if (filename in fileIndices === false) {
        fileIndices[filename] = new Set();
      }

      if (fileIndices[filename].has(entry.index)) {
        errors.push(`${filename}: Index '${entry.index}' already exists.`);
      }

      fileIndices[filename].add(entry.index);
    });

    expect(errors).toEqual([]);
  });
});

describe('api references', () => {
  it('should not contain broken links', () => {
    const errors: string[] = [];
    const resources: Record<string, { index?: unknown; name?: unknown }> = {};

    forEachFileEntry((filename, entry) => {
      if (entry.url === undefined) return;

      indexAndUrlChecks(filename, entry)?.forEach((error: string) => {
        errors.push(error);
      });

      resources[entry.url as string] = { index: entry.index, name: entry.name };
    });

    forEachFileEntry((filename, topLevelEntry) => {
      recurseIntoObject(topLevelEntry, (subEntry) => {
        if (!Object.prototype.hasOwnProperty.call(subEntry, 'url')) return;

        indexAndUrlChecks(filename, subEntry)?.forEach((error: string) => {
          errors.push(error);
        });

        // Do not return errors if flagged as NYI
        if((subEntry.url as string).slice(-4) === '-nyi') {
          errors.forEach((error: string)=>{
            console.warn(error);
          })
          return;
        }

        if (resources[subEntry.url as string] === undefined) {
          errors.push(`${filename}: URL '${subEntry.url}' not found.`);
        } else {
          const resource = resources[subEntry.url as string];
          if (resource.name !== undefined && resource.name !== subEntry.name) {
            errors.push(
              `${filename}: Name mismatch for reference to '${subEntry.url}', '${subEntry.name}' should be '${resource.name}'`
            );
          }

          if (subEntry.index !== undefined && resource.index !== subEntry.index) {
            errors.push(
              `${filename}: Index mismatch for reference to '${subEntry.url}', '${subEntry.index}' should be '${resource.index}'`
            );
          }
        }
      });
    });

    expect(errors).toEqual([]);
  });
});

const forEachFileEntry = (callback: (filename: string, entry: Entry) => void) => {
  const filenames = globSync('src/2024/en/*.json');

  for (const filename of filenames) {
    const fileText = fs.readFileSync(filename, 'utf8');
    const fileJSON = JSON.parse(fileText) as Entry[];
    fileJSON.forEach((entry) => callback(filename, entry));
  }
};

const recurseIntoObject = (object: Entry, callback: (subEntry: Entry) => void) => {
  for (const property in object) {
    if (typeof object[property] === 'object' && object[property] !== null) {
      callback(object[property] as Entry);
      recurseIntoObject(object[property] as Entry, callback);
    }
  }
};

const indexAndUrlChecks = (filename: string, entry: Entry) => {
  const errors: string[] = [];

  if (entry.index === undefined) {
    errors.push(`${filename}: Entry with URL '${entry.url}' should have an index.`);
  }

  // Check Index for whitespace
  if((entry.index as string).indexOf(' ') != -1){
    errors.push(`${filename}: Index '${entry.index as string}' contains whitespace`);
  }

  // Check Index for illegal characters
  if((entry.index as string).match(/[^-a-z0-9()]/)){
    errors.push(`${filename}: Index '${entry.index as string}' contains illegal characters`);
  }

  // Check URL for whitespace
  if((entry.url as string).indexOf(' ') != -1){
    errors.push(`${filename}: URL '${entry.url as string}' contains whitespace`);
  }

  // Check URL for illegal characters
  if((entry.url as string).match(/[^-/a-z0-9()]/)){
    errors.push(`${filename}: URL '${entry.url as string}' contains illegal characters`);
  }

  // Check URL starts correctly
  if(!(entry.url as string).startsWith('/api/2024')){
    errors.push(`${filename}: URL '${entry.url as string}' is malformed`);
  }

  // Check Index matches URL
  if((entry.url as string).slice(-4) == '-nyi'){
    console.warn(`${filename}: URL '${entry.url}' is marked as Not Yet Implemented.`)
  } else {
    if((entry.index as string) != (entry.url as string).slice(0 - (entry.index as string).length)){
      errors.push(`${filename}: Index '${entry.index as string}' does not match URL ${entry.url as string}`);
    }
  }

  return errors;
}
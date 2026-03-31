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

      if (entry.index === undefined) {
        errors.push(`${filename}: Entry with URL '${entry.url}' should have an index.`);
      }

      resources[entry.url as string] = { index: entry.index, name: entry.name };
    });

    forEachFileEntry((filename, topLevelEntry) => {
      recurseIntoObject(topLevelEntry, (subEntry) => {
        if (!Object.prototype.hasOwnProperty.call(subEntry, 'url')) return;

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
  const filenames = globSync('src/2024/*.json');

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
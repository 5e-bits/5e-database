const fs = require("fs");
const glob = require("glob");

describe("duplicate indices", () => {
  it("should contain unique indices", () => {
    let errors = [];
    const fileIndices = {};

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

describe("api references", () => {
  it("should not contain broken links", () => {
    let errors = [];
    let files = glob.sync("src/*.json");

    let resources = {};

    forEachFileEntry((filename, entry) => {
      if (entry.url === undefined) return;

      if (entry.index === undefined) {
        errors.push(`${filename}: Entry with URL '${entry.url}' should have an index.`);
      }

      resources[entry.url] = { index: entry.index, name: entry.name };
    });

    forEachFileEntry((filename, topLevelEntry) => {
      recurseIntoObject(topLevelEntry, (subEntry) => {
        if (!subEntry.hasOwnProperty("url")) return;

        if (resources[subEntry.url] === undefined) {
          errors.push(`${filename}: URL '${subEntry.url}' not found.`);
        } else {
          if (resources[subEntry.url].name !== undefined && resources[subEntry.url].name !== subEntry.name) {
            errors.push(`${filename}: Name mismatch for reference to '${subEntry.url}', '${subEntry.name}' should be '${resources[subEntry.url].name}'`);
          }

          if (subEntry.index !== undefined && resources[subEntry.url].index !== subEntry.index) {
            errors.push(`${filename}: Index mismatch for reference to '${subEntry.url}', '${subEntry.index}' should be '${resources[subEntry.url].index}'`);
          }
        }
      });
    });

    expect(errors).toEqual([]);
  });
});

/**
 * Calls the callback for top-level objects/arrays in all JSON files.
 *
 * @param (function(string, object)) callback Called with filename and each
 *     top-level entry.
 */
const forEachFileEntry = (callback) => {
    let filenames = glob.sync("src/*.json");

    for (const filename of filenames) {
      const fileText = fs.readFileSync(filename, "utf8");
      const fileJSON = JSON.parse(fileText);
      fileJSON.forEach((entry) => callback(filename, entry));
    }
};

/**
 * Calls the callback recursivelly for all objects/arrays contained in the
 * passed object.
 *
 * @param (object) object The object to recurse into.
 * @param (function(object)) callback Called with each sub-top-level entry.
 */
const recurseIntoObject = (object, callback) => {
  for (const property in object) {
    if (typeof object[property] === "object" && object[property] !== null) {
      callback(object[property]);
      recurseIntoObject(object[property], callback);
    }
  }
};

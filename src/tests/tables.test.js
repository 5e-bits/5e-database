const fs = require("fs");
const glob = require("glob");

describe("duplicate indices", () => {
  it("should contain unique indices", () => {
    let errors = [];
    const fileIndices = {};

    forEachFile((filename, entry) => {
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

    forEachFile((filename, entry) => {
      if (entry.url !== undefined) {
        if (entry.index === undefined) {
          errors.push(`${filename}: Entry with URL '${entry.url}' should have an index.`);
        }

        resources[entry.url] = { index: entry.index, name: entry.name };
      }
    });

    forEachFileRecursive((filename, entry) => {
      if (entry.hasOwnProperty("url")) {
        if (resources[entry.url] === undefined) {
          errors.push(`${filename}: URL '${entry.url}' not found.`);
        } else {
          if (resources[entry.url].name !== undefined && resources[entry.url].name !== entry.name) {
            errors.push(`${filename}: Name mismatch for reference to '${entry.url}', '${entry.name}' should be '${resources[entry.url].name}'`);
          }

          if (entry.index !== undefined && resources[entry.url].index !== entry.index) {
            errors.push(`${filename}: Index mismatch for reference to '${entry.url}', '${entry.index}' should be '${resources[entry.url].index}'`);
          }
        }
      }
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
const forEachFile = (callback) => {
    let filenames = glob.sync("src/*.json");

    for (const filename of filenames) {
      const fileText = fs.readFileSync(filename, "utf8");
      const fileJSON = JSON.parse(fileText);
      fileJSON.forEach((entry) => callback(filename, entry));
    }
};

/**
 * Calls the callback for all non-top-level objects/arrays in all JSON files.
 * Does not overlap with entries from forEachFile().
 *
 * @param (function(string, object)) callback Called with filename and each
 *     sub-top-level entry.
 */
const forEachFileRecursive = (callback) => {
  const recurse = (filename, entry) => {
    for (const property in entry) {
      if (typeof entry[property] === "object" && entry[property] !== null) {
        callback(filename, entry[property]);
        recurse(filename, entry[property]);
      }
    }
  };

  forEachFile(recurse);
};

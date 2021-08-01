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

describe("broken links", () => {
  it("should not contain broken links", () => {
    let errors = [];
    let files = glob.sync("src/*.json");

    let resources = {};

    const walk_recursive = (resources, file, object, errors) => {
      for (const property in object) {
        if (property === "url") {
          if (resources[object.url] === undefined) {
            errors.push(`${file}: URL '${object.url}' not found.`);
          } else {
            if (resources[object.url].name !== undefined && resources[object.url].name !== object.name) {
              errors.push(`${file}: Name mismatch for reference to '${object.url}', '${object.name}' should be '${resources[object.url].name}'`);
            }

            if (object.index !== undefined && resources[object.url].index !== object.index) {
              errors.push(`${file}: Index mismatch for reference to '${object.url}', '${object.index}' should be '${resources[object.url].index}'`);
            }
          }
        } else if (typeof object[property] === "object") {
          walk_recursive(resources, file, object[property], errors);
        }
      }
    };

    forEachFile((filename, entry) => {
      if (entry.url !== undefined) {
        if (entry.index === undefined) {
          errors.push(`${filename}: Entity with URL '${entry.url}' should have an index.`);
        }

        resources[entry.url] = { index: entry.index, name: entry.name };
      }
    });

    forEachFile((filename, entry) => {
      for (const property in entry) {
        if (typeof entry[property] === "object") {
          walk_recursive(resources, filename, entry[property], errors);
        }
      }
    });

    expect(errors).toEqual([]);
  });
});

const forEachFile = (callback) => {
    let filenames = glob.sync("src/*.json");

    for (const filename of filenames) {
      const fileText = fs.readFileSync(filename, "utf8");
      const fileJSON = JSON.parse(fileText);
      fileJSON.forEach((entry) => callback(filename, entry));
    }
};

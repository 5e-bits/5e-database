const fs = require("fs");
const glob = require("glob");

describe("duplicate indices", () => {
  it("should contain unique indices", () => {
    let errors = [];
    let files = glob.sync("src/*.json");

    for (const file of files) {
      const fileText = fs.readFileSync(file, "utf8");
      const fileJSON = JSON.parse(fileText);
      const indices = new Set();
      fileJSON.forEach((entry) => {
        if (indices.has(entry.index)) {
          errors.push(`${file}: Index '${entry.index}' already exists.`);
        }
        indices.add(entry.index);
      });
    }
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

    for (const file of files) {
      const fileText = fs.readFileSync(file, "utf8");
      const fileJSON = JSON.parse(fileText);
      fileJSON.forEach((entry) => {
        if (entry.url !== undefined) {
          if (entry.index === undefined) {
            errors.push(`${file}: Entity with URL '${entry.url}' should have an index.`);
          }

          resources[entry.url] = { index: entry.index, name: entry.name };
        }
      });
    }

    for (const file of files) {
      const fileText = fs.readFileSync(file, "utf8");
      const fileJSON = JSON.parse(fileText);
      fileJSON.forEach((entry) => {
        for (const property in entry) {
          if (typeof entry[property] === "object") {
            walk_recursive(resources, file, entry[property], errors);
          }
        }
      });
    }

    expect(errors).toEqual([]);
  });
});

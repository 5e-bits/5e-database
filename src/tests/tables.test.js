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

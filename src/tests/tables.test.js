const fs = require("fs");
const glob = require("glob");

const abilityScoresText = fs.readFileSync(
  "src/5e-SRD-Ability-Scores.json",
  "utf8"
);
const abilityScores = JSON.parse(abilityScoresText);

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

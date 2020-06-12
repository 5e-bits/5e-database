const fs = require("fs");
const abilityScoresText = fs.readFileSync(
  "src/5e-SRD-Ability-Scores.json",
  "utf8"
);
const abilityScores = JSON.parse(abilityScoresText);

describe("duplicate indices", () => {
  it("should contain unique indices", () => {
    const errors = [];
    const indices = new Set();
    for (const abilityScore of abilityScores) {
      if (indices.has(abilityScore.index)) {
        errors.push(`Index '${abilityScore.index}' already exists.`);
      }
      indices.add(abilityScore.index);
    }
    expect(errors).toEqual([]);
  });
});

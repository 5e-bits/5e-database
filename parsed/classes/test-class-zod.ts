import { ClassSchema } from './5e-SRD-Classes'; // Adjust path as needed

const barbarianData = {
  index: "barbarian",
  name: "Barbarian",
  hit_die: 12,
  primary_ability: {
    desc: "Strength",
    all_of: [{ index: "str", name: "STR", url: "/api/2024/ability-scores/str" }]
  },
  class_levels: "/api/2024/classes/barbarian/levels",
  proficiency_choices: [],
  starting_equipment_options: [],
  url: "/api/2024/classes/barbarian"
};

const result = ClassSchema.safeParse(barbarianData);

if (result.success) {
  console.log("✅ Schema is working perfectly!");
} else {
  console.error("❌ Schema Validation Failed:");
  console.log(JSON.stringify(result.error.format(), null, 2));
}
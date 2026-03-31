import test from "./test-function.js";
import MagicItems from "../5e-SRD-Magic-Items.json" with { type: "json" }

// Mandatory Properties
const mandatory = {
	"name"               : "string",
	"index"              : "string",
	"url"                : "string",
	"image"              : "string",
	"equipment_category" : "object",
	"variant"            : "boolean",
	"variants"           : "array",
	"attunement"         : "boolean",
	"rarity"             : "object",
	"desc"               : "string"
};
// Optional Properties
const optional = {
	"limited-to"         : "string"
}


// Tests
test(MagicItems, mandatory, optional);
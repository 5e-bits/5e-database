const args = process.argv;
let start_index = args[2]
let num_items = args[3]

for (var i = 0; i < num_items; i++) {
    console.log("\"http://dnd5eapi.co/api/features/" + (parseInt(start_index) + i) + "\",");
}
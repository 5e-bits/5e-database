const args = process.argv;
let resource = args[2]
let start_index = args[3]
let num_items = args[4]

for (var i = 0; i < num_items; i++) {
    console.log("\"http://dnd5eapi.co/api/" + resource + "/" + (parseInt(start_index) + i) + "\",");
}
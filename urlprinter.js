const args = process.argv;
let resource = args[2]
let start_index = args[3]
let end_index = args[4]

// for (var i = 0; i <= end_index; i++) {
//     console.log("\"http://dnd5eapi.co/api/" + resource + "/" + (parseInt(start_index) + i) + "\",");
// }
var i = start_index;
while (i != (parseInt(end_index) + 1)) {
    console.log("\"http://dnd5eapi.co/api/" + resource + "/" + i + "\",");
    i++;
}
var fs = require('fs');

const args = process.argv;
let resource = args[2]
let start_index = args[3]
let end_index = args[4]

let input_filename = "./5e-SRD-" + resource + ".json"

if (args.length > 4) {
  fs.readFile(input_filename, 'utf8', (err,data) => {
    data = JSON.parse(data);
    var i = start_index - 1;
    while (i != (parseInt(end_index))) {
      console.log(`{ "url": "${data[i].url}", "name": "${data[i].name}" },`);
      i++;
    }
  })
} else {
  fs.readFile(input_filename, 'utf8', (err,data) => {
    data = JSON.parse(data);
    var i = start_index - 1;
    console.log(`{ "url": "${data[i].url}", "name": "${data[i].name}" },`);
  })
}


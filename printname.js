var http = require('http');
var fs = require('fs');

const args = process.argv;
let data_type = args[2]
let type_check = args[3]

let results = [];
addsubclass();


function addsubclass() {

	let input_filename = "z.json"

	let urlfix = (err,data) => {

		data = JSON.parse(data);

		// number the indexes and change the URLs
		for(let i = 0; i < data.length; i++) {
			var level = data[i].level;
			if (data[i].patrons == "Fiend") {
				console.log(data[i].name);
			}
		}
	}

	fs.readFile(input_filename, 'utf8', (err,data) => {
		return urlfix(err,data);
	})

}

// mongoimport -h ds133158.mlab.com:33158 -d 5e-srd-api -c classfeatures -u admin -p password --file upload-5e-SRD-classfeatures.json --jsonArray

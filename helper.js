var fs = require('fs');
let all_data_types = ["classes", "classfeatures", "classtables", "equipment", "monsters", "proficiencies", "spells", "startingequipment"]

function create_upload_file(datatype_string) {

	let input_filename = "./5e-SRD-" + datatype_string + ".json"
	let index_and_urlify = (err,data) => {
		
		data = JSON.parse(data);

		let keys = Object.keys(data);

		// number the indexes and change the URLs
		for(let i = 0; i < data.length; i++) {
			data[i].index = i + 1;
			data[i].url = "http://dnd5eapi.co/api/" + datatype_string + "/"+ (i + 1).toString();			
		}

		let output_filename = "./upload-5e-SRD-" + datatype_string + ".json";

		fs.writeFile(output_filename, JSON.stringify(data), (err) => {
			if (err) throw err;
			console.log('Success');
			console.log("mongoimport -h ds133158.mlab.com:33158 -d 5e-srd-api -c " + datatype_string + " -u admin -p password --file upload-5e-SRD-" + datatype_string + ".json --jsonArray")
		});
	}

	fs.readFile(input_filename, 'utf8', (err,data) => {
		return index_and_urlify(err,data);
	})

}

function create_all_upload_files() {
	for (let i = 0; i < all_data_types.length; i++) {
		create_upload_file(all_data_types[i]);
	}
}

const args = process.argv;
let data_type = args[2]

create_upload_file(data_type);

// mongoimport -h ds133158.mlab.com:33158 -d 5e-srd-api -c classfeatures -u admin -p password --file upload-5e-SRD-classfeatures.json --jsonArray
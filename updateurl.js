var http = require('http');
var fs = require('fs');

const args = process.argv;
let data_type = args[2]
create_upload_file(data_type);

function create_upload_file(datatype_string) {
	
	let input_filename = "./5e-SRD-" + datatype_string + ".json"

	let urlfix = (err,data) => {
		
		// data = JSON.parse(data);

		// var url = "http://dnd5eapi.co/api/classes"
		http.get('http://localhost:3000/api/classes/', (res) => {
			const statusCode = res.statusCode;
			const contentType = res.headers['content-type'];
			console.log(res);

			let error;
			if (statusCode !== 200) {
				error = new Error(`Request Failed.\n` +
								`Status Code: ${statusCode}`);
			} else if (!/^application\/json/.test(contentType)) {
				error = new Error(`Invalid content-type.\n` +
								`Expected application/json but received ${contentType}`);
			}
			if (error) {
				console.log(error.message);
				// consume response data to free up memory
				res.resume();
				return;
			}

			res.setEncoding('utf8');
			let rawData = '';
			res.on('data', (chunk) => rawData += chunk);
			res.on('end', () => {
				try {
				let parsedData = JSON.parse(rawData);
				console.log(parsedData);
				} catch (e) {
				console.log(e.message);
				}
			});
		}).on('error', (e) => {
			console.log(`Got error: ${e.message}`);
		});




		// number the indexes and change the URLs
		// for(let i = 0; i < data.length; i++) {
		// 	data[i].index = i + 1;
		// 	if (data_type !== "levels") {
		// 		data[i].url = "http://dnd5eapi.co/api/" + datatype_string + "/"+ (i + 1).toString();
		// 	}			
		// }

		// let output_filename = "./upload-5e-SRD-" + datatype_string + ".json";

		// fs.writeFile(output_filename, JSON.stringify(data), (err) => {
		// 	if (err) throw err;
		// 	console.log('Success');
		// 	console.log("mongoimport -h ds133158.mlab.com:33158 -d 5e-srd-api -c " + datatype_string + " -u admin -p password --file upload-5e-SRD-" + datatype_string + ".json --jsonArray")
		// });
	}

	fs.readFile(input_filename, 'utf8', (err,data) => {
		return urlfix(err,data);
	})

}

// mongoimport -h ds133158.mlab.com:33158 -d 5e-srd-api -c classfeatures -u admin -p password --file upload-5e-SRD-classfeatures.json --jsonArray

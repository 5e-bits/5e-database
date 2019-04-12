var http = require('http');
var fs = require('fs');

const args = process.argv;
let data_type = args[2]
let type_check = args[3]

let results = [];
getResultsFromAPI(type_check);





function getResultsFromAPI(type_to_check) {
	var url = 'http://www.dnd5eapi.co/api/' + type_to_check + '/';

	http.get(url, (res) => {
		const statusCode = res.statusCode;
		const contentType = res.headers['content-type'];

		let error;
		if (statusCode !== 200) {
			error = new Error(`Request Failed.\n` + `Status Code: ${statusCode}`);
		} else if (!/^application\/json/.test(contentType)) {
			error = new Error(`Invalid content-type.\n` + `Expected application/json but received ${contentType}`);
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
				parsedData.results.forEach( (obj) => {
					results.push(obj);
				})

				fixLinks(data_type, results);
			} catch (e) {
				console.log(e.message);
			}
		});
	}).on('error', (e) => {
		console.log(`Got error: ${e.message}`);
	});
}

function fixLinks(datatype_string, reference) {
	let input_filename = "./5e-SRD-" + datatype_string + ".json"
	let urlfix = (err,data) => {

		data = JSON.parse(data);

		// number the indexes and change the URLs
		for(let i = 0; i < data.length; i++) {

			// THE THING TO CHECK FOR ERRORS
			data[i].from.forEach( function(element) {
				// console.log(element.name);
				let newurl =  results.find( (item) => {
					return item.name === element.name
				}).url;
				// console.log(newurl);

				element.url = newurl;
				console.log(element);
			})
		}

		let output_filename = "./upload-5e-SRD-" + datatype_string + ".json";

		fs.writeFile(output_filename, JSON.stringify(data), (err) => {
			if (err) throw err;
			console.log('Success');
			console.log("mongoimport -h ds133158.mlab.com:33158 -d 5e-srd-api -c " + datatype_string + " -u admin -p password --file upload-5e-SRD-" + datatype_string + ".json --jsonArray")
		});
	}

	fs.readFile(input_filename, 'utf8', (err,data) => {
		return urlfix(err,data);
	})
}

// mongoimport -h ds133158.mlab.com:33158 -d 5e-srd-api -c classfeatures -u admin -p password --file upload-5e-SRD-classfeatures.json --jsonArray

var http = require('http');
var fs = require('fs');

const args = process.argv;
let data_type = args[2]
let class_name = args[3]

fill_in_features();


function getFeaturesFromAPI(callback) {
  var url = 'http://www.dnd5eapi.co/api/features/';
  // console.log(url);

  http.get(url, (res) => {
    const statusCode = res.statusCode;
    const contentType = res.headers['content-type'];

    // console.log('were in');

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
        let results = [];
        let parsedData = JSON.parse(rawData);
        parsedData.results.forEach( (obj) => {
          results.push(obj);
        })

        callback(results);
      } catch (e) {
        console.log(e.message);
      }
    });
  }).on('error', (e) => {
    console.log(`Got error: ${e.message}`);
  });
}

function sleep(seconds){
  var waitUntil = new Date().getTime() + seconds;
  while(new Date().getTime() < waitUntil) true;
}


function fill_in_features(datatype_string, class_name) {

	let input_filename = "./5e-SRD-" + "features" + ".json"

	let fill_in = (err,data) => {

		data = JSON.parse(data);
    newData = [];

    // for each feature
    getFeaturesFromAPI((filled) => {
      for(let i = 0; i < data.length; i++) {
        // filled is the correct list.
        // we want to go through each choice'd feature and update its list
        if (data[i].choice !== undefined) {
          data[i].choice.from.forEach( (wrongFeature) => {
              wrongFeature.url = filled.find( (correctFeature) => {
                  return correctFeature.name == wrongFeature.name;
              }).url;
          })

          newData.push(data[i]);
        }

        if (newData.length == 28) {
          let output_filename = "./upload-5e-SRD-" + datatype_string + ".json";
          fs.writeFile(output_filename, JSON.stringify(data), (err) => {
            if (err) throw err;
            console.log('Success');
            console.log("mongoimport -h ds133158.mlab.com:33158 -d 5e-srd-api -c " + datatype_string + " -u admin -p password --file upload-5e-SRD-" + datatype_string + ".json --jsonArray")
          });
          break;
        }
      }
    });
	}

	fs.readFile(input_filename, 'utf8', (err,data) => {
		fill_in(err,data);
	})
}

// mongoimport -h ds133158.mlab.com:33158 -d 5e-srd-api -c classfeatures -u admin -p password --file upload-5e-SRD-classfeatures.json --jsonArray

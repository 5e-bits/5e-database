var http = require('http');
var fs = require('fs');

const args = process.argv;
let data_type = args[2]
let class_name = args[3]

fill_in_features(data_type, class_name);






function getLevelFeaturesFromAPI(class_name, level, printLength) {
  var url = 'http://www.dnd5eapi.co/api/features/' + class_name + '/level/' + (level);
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

        printLength(results);
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
	let input_filename = "./5e-SRD-" + datatype_string + ".json"

	let fill_in = (err,data) => {

		data = JSON.parse(data);
    newData = [];

		// number the indexes and change the URLs
		for(let i = 0; i < data.length; i++) {
      if (data[i].class.name === class_name.charAt(0).toUpperCase() + class_name.slice(1).toLowerCase()) {
        let level = data[i].level;
        getLevelFeaturesFromAPI(class_name, level, (filled) => {
          // console.log(filled.length);
          data[i].features = [];
          data[i].feature_choices = [];
          filled.forEach( (thing) => {
            if (thing.choice === undefined) {
              data[i].features.push(thing);
            } else {
              data[i].feature_choices.push(thing);
            }
          })
          newData.push(data[i]);
          if (newData.length == 20) {
            let output_filename = "./upload-5e-SRD-" + datatype_string + ".json";
            fs.writeFile(output_filename, JSON.stringify(data), (err) => {
              if (err) throw err;
              console.log('Success');
              console.log("mongoimport -h ds133158.mlab.com:33158 -d 5e-srd-api -c " + datatype_string + " -u admin -p password --file upload-5e-SRD-" + datatype_string + ".json --jsonArray")
            });
          }

        });
      }
		}
	}

	fs.readFile(input_filename, 'utf8', (err,data) => {
		fill_in(err,data);
	})
}

// mongoimport -h ds133158.mlab.com:33158 -d 5e-srd-api -c classfeatures -u admin -p password --file upload-5e-SRD-classfeatures.json --jsonArray

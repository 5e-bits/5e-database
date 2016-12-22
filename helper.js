var fs = require('fs');

var collection = [];

fs.readFile('./5e-SRD-equipment.json', 'utf8', function (err,data) {
  data = JSON.parse(data);

	var keys = Object.keys(data);

	// number the indexes
	for(var i = 0; i < data.length; i++) {
		data[i].index = i + 1;
		data[i].url = "http://dnd5eapi.co/api/equipment/"+ (i + 1).toString();
		collection.push(data[i]);
	}

	fs.writeFile('./5e-SRD-equipment-upload.json', JSON.stringify(collection), (err) => {
		if (err) throw err;
		console.log('Success');
  	});
});

// mongoimport -h ds133158.mlab.com:33158 -d 5e-srd-api -c equipment -u admin -p password --file 5e-SRD-equipment-upload.json --jsonArray

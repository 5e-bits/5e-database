var http = require('http');
var fs = require('fs');

const args = process.argv;
let data_type = args[2]
let type_check = args[3]

let results = [];
addsubclass();

function addsubclass() {

	let input_filename = "./5e-SRD-" + "spells" + ".json"
	let urlfix = (err,data) => {
		data = JSON.parse(data);
		devotion = [
      "Beacon of Hope",
      "Commune",
      "Dispel Magic",
      "Flame Strike",
      "Freedom of Movement",
      "Lesser Restoration",
      "Protection from Evil and Good",
      "Sanctuary",
      "Zone of Truth"
    ]

		fiend = [
      "Blindness/Deafness",
      "Burning Hands",
      "Command",
      "Fireball",
      "Fire Shield",
      "Flame Strike",
      "Hallow",
      "Scorching Ray",
      "Stinking Cloud",
      "Wall of Fire"
    ]

		// number the indexes and change the URLs
		for(let i = 0; i < data.length; i++) {
      if (devotion.indexOf(data[i].name) != -1) {
        data[i].subclasses.push({
          name: "Devotion",
          url: "http://dnd5eapi.co/api/subclasses/7"
        })
      }

      if (fiend.indexOf(data[i].name) != -1) {
        data[i].subclasses.push({
          name: "Fiend",
          url: "http://dnd5eapi.co/api/subclasses/11"
        })
      }
    }

		let output_filename = "./upload-5e-SRD-" + "spells" + ".json";

		fs.writeFile(output_filename, JSON.stringify(data), (err) => {
			if (err) throw err;
			console.log('Success');
			console.log("mongoimport -h ds133158.mlab.com:33158 -d 5e-srd-api -c " + "spells" + " -u admin -p password --file upload-5e-SRD-" + "spells" + ".json --jsonArray")
		});
	}

	fs.readFile(input_filename, 'utf8', (err,data) => {
		return urlfix(err,data);
	})
}

// mongoimport -h ds133158.mlab.com:33158 -d 5e-srd-api -c classfeatures -u admin -p password --file upload-5e-SRD-classfeatures.json --jsonArray

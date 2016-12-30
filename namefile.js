var fs = require('fs');
var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest

var HttpClient = function() {
    this.get = function(aUrl, aCallback) {
        var anHttpRequest = new XMLHttpRequest();
        anHttpRequest.onreadystatechange = function() { 
            if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200)
                aCallback(anHttpRequest.responseText);
        }

        anHttpRequest.open( "GET", aUrl, true );            
        anHttpRequest.send( null );
    }
}
var client = new HttpClient();


function modify_file(datatype_string) {

	let input_filename = "./5e-SRD-" + datatype_string + ".json"
    let output_filename = "./named-5e-SRD-" + datatype_string + ".json";
	
    let name_ify = (err,data) => {
        json_data = JSON.parse(data);

        for (let i = 0; i < json_data.length; i++) {

            if (json_data[i].spells !== undefined) {
                let named_acquisitions = []

                let p2 = new Promise((resolve, reject) => {
                    json_data[i].spells.map((spell_acquisition) => {
                        client.get(spell_acquisition.spell.url, function(response) {
                            let p1 = new Promise((resolve, reject) => {
                                while (response == null) {

                                }
                                acquisition_json = JSON.parse(response);
                                resolve(acquisition_json);
                            })

                            p1.then((acquisition_json) => {
                                spell_acquisition.spell.name = acquisition_json.name;
                                named_acquisitions.push(spell_acquisition);
                                if (named_acquisitions.length == json_data[i].spells.length) {
                                    resolve(named_acquisitions)
                                }
                                return spell_acquisition;
                            })
                        });
                    })
                })
                p2.then((named_acquisitions) => {
                    json_data[i].spells = named_acquisitions;
                    console.log(named_acquisitions.length)
                })

            }
        }

        fs.writeFile(output_filename, (json_data), (err) => {
            if (err) throw err;
            console.log('Success');
        });
    
    }

    fs.readFile(input_filename, 'utf8', (err,data) => {
        return name_ify(err,data)
    })


}
function create_all_upload_files() {
	for (let i = 0; i < all_data_types.length; i++) {
		create_upload_file(all_data_types[i]);
	}
}

const args = process.argv;
let data_type = args[2]
modify_file(data_type);
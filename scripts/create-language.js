var fs = require('fs')

String.prototype.trimLeft = function(charlist) {
	if (charlist === undefined)
		charlist = "\s";
  
	return this.replace(new RegExp("^[" + charlist + "]+"), "");
};

String.prototype.trimRight = function(charlist) {
	if (charlist === undefined)
		charlist = "\s";
  
	return this.replace(new RegExp("[" + charlist + "]+$"), "");
};

fs.readdir('src', (err, fileNames) => {
	if (err) {
		return console.log(err);
	}

	const languageKeysArray = [];
	let languageKeysJSON = {};

	fileNames.forEach(fileName => {
		const data = fs.readFileSync(`src/${fileName}`, 'utf8');

		if (!data) {
			return console.log(err);
		}

		const fileLanguageKeysJSON = {};

		const dataJSON = JSON.parse(data);

		const iterateJSON = function(obj) {
			if (typeof obj !== 'object') {
				return obj;
			}

			for(var key in obj) {
				if (
					(key === 'name' || key === 'class' || key === 'full_name' || key === 'desc')
					&& typeof obj[key] === 'string'
				){
					const string = obj[key];

					const newKey = 'LANG-KEY-' + string.replace(/\s+/g, '-')
						.replace(/[\:\'\"\,\.\(\))]*/g, '')
						.toLowerCase().trimLeft('-').trimRight('.');

					obj[key] = newKey;

					fileLanguageKeysJSON[newKey] = string;
				}
				else if (key === 'desc' && obj[key] instanceof Array) {
					obj[key] = obj[key].map(item => {
						const newKey = 'LANG-KEY-' + item.replace(/\s+/g, '-')
							.replace(/[\:\'\"\,\.\(\))]*/g, '')
							.replace(/-{2,}/g, '-')
							.toLowerCase().trimLeft('-').trimRight('.');

						fileLanguageKeysJSON[newKey] = item;
						
						return newKey;						
					});
				}

				obj[key] = iterateJSON(obj[key]);
			}

			return obj;
		};

		iterateJSON(dataJSON);

		Object.assign(languageKeysJSON, fileLanguageKeysJSON);

		fs.writeFile(`src/${fileName}`, JSON.stringify(dataJSON, null, '\t'), 'utf8', err => {
			if (err) return console.log(err);
		});
	});

	Object.entries(languageKeysJSON).forEach(entry => {
		languageKeysArray.push([entry[0], entry[1]]);
	})

	languageKeysJSON = {};

	languageKeysArray.sort().forEach(item => {
		languageKeysJSON[item[0]] = item[1]
	});
	
	if (!fs.existsSync('languages')){
		fs.mkdirSync('languages');
	}

	fs.writeFile('languages/en.json', JSON.stringify(languageKeysJSON, null, '\t'), 'utf8', err => {
		if (err) return console.log(err);
	});
});
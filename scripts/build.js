var fs = require('fs')

const srcFiles = fs.readdirSync('src');

if (!fs.existsSync('.tmp')){
	fs.mkdirSync('.tmp');
}

fs.readdir('languages', (err, languageFileNames) => {
	if (err) {
		return console.log(err);
	}

	languageFileNames.forEach(languageFileName => {
		const languageData = fs.readFileSync(`languages/${languageFileName}`, 'utf8');

		if (!languageData) {
			return console.log(err);
		}

		const languageDataJSON = JSON.parse(languageData);

		srcFiles.forEach(srcFileName => {
			let srcFileData = fs.readFileSync(`src/${srcFileName}`, 'utf8');

			Object.entries(languageDataJSON).forEach(entry => {
				srcFileData = srcFileData.replace(new RegExp(`"${entry[0]}"`, 'g'), `"${entry[1]}"`);
			});

			srcFileData = srcFileData.replace(/"url": "\/api\/(.*)"/g, `"url": "/api/${languageFileName.split('.')[0]}/$1"`);

			fs.writeFile(`.tmp/${srcFileName.split('.')[0]}_${languageFileName}`, srcFileData, 'utf8', err => {
				if (err) return console.log(err);
			});
		});
	});
});
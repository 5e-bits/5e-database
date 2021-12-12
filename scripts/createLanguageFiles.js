const path = require('path')
const fs = require('fs')

const supportedLanguages = ['en-us', 'pt-br']

console.log('---> Supported Languages:', ...supportedLanguages, "\n")
console.log('---> Creating language files... \n')

supportedLanguages.forEach(language => {
    console.log(`---> Generating ${language} assets:`)
    const keyFiles = fs.readdirSync(path.join('..', 'localization', 'keys', language));

    keyFiles.forEach(keyFileName => {
        console.log(`------> Generating ${keyFileName}`)
        
        const keyFile = fs.readFileSync(path.join('..', 'localization', 'keys', language, keyFileName), 'utf8');
        const keysJson = JSON.parse(keyFile);
    
        let sourceFile = fs.readFileSync(path.join('..', 'src', keyFileName), 'utf8');
        
        Object.keys(keysJson).forEach(entry => {
            sourceFile = sourceFile.replace(new RegExp(`"${entry}"`, 'g'), `"${keysJson[entry]}"`);
        })
    
        fs.writeFile(path.join('..', 'localization', language, keyFileName), sourceFile, 'utf8', err => {
            if (err) return console.log(err);
        });
    })
    console.log(`\n---------------> DONE <--------------\n`)
})

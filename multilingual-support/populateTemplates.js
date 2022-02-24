var fs = require('fs')
var { Liquid } = require('liquidjs')
var engine = new Liquid()
var readFile = require('./_helpers').readFile
var setAsync = require('./_helpers').setAsync

const sourceLocalePath = 'multilingual-support/source-locale.json'
const templatesDir = 'multilingual-support/templates'
const outputDir = 'multilingual-support/output'

// replace template tags with locale data values using liquidjs
const replace = (templateData, property, context, localeData) => {
  if (typeof templateData === 'string' && templateData.indexOf('{{') != -1) {
    return setAsync(context, property, engine.parseAndRender(templateData, localeData))
  }

  return templateData
}

// recursively populate templates with locale data
const populateTemplate = async (templateData, property, context, localeData) => {
  if (templateData && Array.isArray(templateData)) {
    await Promise.all(templateData.map((item, index) => populateTemplate(item, index, templateData, localeData)))
  } else if (templateData && typeof templateData === 'object') {
    await Promise.all(Object.keys(templateData).map(key => populateTemplate(templateData[key], key, templateData, localeData)))
  } else {
    await replace(templateData, property, context, localeData)
  }
}

// write populated template to file
const outputPopulatedTemplate = (populatedTemplate, fileName) => {
  const output = JSON.stringify(populatedTemplate, null, 2) + '\n'

  // create output directory, if it doesn't already exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir)
  }

  // write output data to files with original filename
  fs.writeFile(`${outputDir}/${fileName}`, output, 'utf8', e => e ? console.error(e) : null)
}

// load locale data from source locale file
readFile(sourceLocalePath)
  .then(localeFileContents => {
    const localeData = JSON.parse(localeFileContents)

    // get all files in template folder
    fs.readdir(templatesDir, (error, fileNames) => {
      if (error) {
        return console.log(error)
      }

      const promises = fileNames.map(fileName => {
        return readFile(`${templatesDir}/${fileName}`)
          .then(templateFileContents => {
            const templateData = JSON.parse(templateFileContents)

            // populate and output template to file
            return Promise
              .resolve(populateTemplate(templateData, null, null, localeData))
              .then(() => outputPopulatedTemplate(templateData, fileName))
              .catch(e => console.error(e))
          })
      })

      promises.reduce((previous, current) => previous.then(current), Promise.resolve())
    })
  })
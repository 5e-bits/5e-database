var path = require('path')
var fs = require('fs')
var _ = require('lodash')
var { Liquid } = require('liquidjs')
var engine = new Liquid()
var readFile = require('./_helpers').readFile
var setAsync = require('./_helpers').setAsync

const localesDir = 'multilingual-support/locales'
const templatesDir = 'multilingual-support/templates'
const outputDir = 'multilingual-support/output'

const isReplacable = (string) => {
  return typeof string === 'string' && string.indexOf('{{') != -1
}

// replace template tags with locale data values using liquidjs
const replace = (templateData, property, context, localeData, localeKey) => {
  if (isReplacable(templateData)) {
    if (Array.isArray(context)) {
      return setAsync(context, property, engine.parseAndRender(templateData, localeData))
    } else {
      return setAsync(context, property, engine.parseAndRender(templateData, localeData), localeKey)
    }
  }

  return templateData
}

// recursively populate templates with locale data
const populateTemplate = async (templateData, property, context, localeData, localeKey) => {
  if (templateData && Array.isArray(templateData)) {
    await Promise.all(templateData.map((item, index) => populateTemplate(item, index, templateData, localeData, localeKey)))
  } else if (templateData && typeof templateData === 'object') {
    await Promise.all(Object.keys(templateData).map(key => {
      if (Array.isArray(templateData[key]) && templateData[key].length && templateData[key].every(i => isReplacable(i))) {
        templateData[key] = {
          [localeKey]: templateData[key]
        }

        return populateTemplate(templateData[key][localeKey], localeKey, templateData, localeData, localeKey)
      }

      return populateTemplate(templateData[key], key, templateData, localeData, localeKey)
    }))
  } else {
    await replace(templateData, property, context, localeData, localeKey)
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

// load locale data from locales directory
fs.readdir(localesDir, (error, localeFileNames) => {
  if (error) {
    return console.log(error)
  }

  // get all files in template folder
  fs.readdir(templatesDir, (error, fileNames) => {
    if (error) {
      return console.log(error)
    }

    const promises = fileNames.map(fileName => {
      let joinedData = {}

      return readFile(`${templatesDir}/${fileName}`)
        .then(templateFileContents => {
          return Promise.all(localeFileNames.map(localeFileName => {
            const templateData = JSON.parse(templateFileContents)
            const localeKey = path.parse(localeFileName).name

            return readFile(`${localesDir}/${localeFileName}`)
              .then(localeFileContents => {
                const localeData = JSON.parse(localeFileContents)

                // populate and output template to file
                return Promise
                  .resolve(populateTemplate(templateData, null, null, localeData, localeKey))
                  .then(() => {
                    joinedData = _.merge(templateData, joinedData)

                    return joinedData
                  })
                  .catch(e => console.error(e))
              })
          }))
        })
        .then(outputData => outputPopulatedTemplate(outputData, fileName))
    })

    promises.reduce((previous, current) => previous.then(current), Promise.resolve())
  })
})
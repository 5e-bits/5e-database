var fs = require('fs')
var _ = require('lodash')
require('./_prototype')
var readFile = require('./_helpers').readFile
var setAsync = require('./_helpers').setAsync

// asynchronous lodash setter
const lodashSetAsync = (object, path, pendingValue) => pendingValue.then(value => _.set(object, path, value))

// recognize common patterns in data implying it's a reference
const isLikelyAReference = (data) => {
  const dataKeys = Object.keys(data)

  return (
    dataKeys.length === 3
			&& dataKeys.sort().toString() == ['index', 'name', 'url'].sort().toString()
  ) || (
    dataKeys.length === 4
			&& dataKeys.sort().toString() == ['index', 'name', 'type', 'url'].sort().toString()
			&& data.type === 'level'
  )
}

// separate template and locale data
const separate = async (templateData, property, context, localeData, path, potentialDuplicates) => {
  let value = templateData
  let addToLocaleData = false
  const pathArray = path.split('.')
  const parentProperty = pathArray[pathArray.length - 2]
  const promises = []

  if (
    [
      'abbreviation',
      'age',
      'desc',
      'full_name',
      'language_desc',
      'material',
      'name',
      'size_description',
    ].includes(property) ||
    [
		  'desc',
		  'from',
		  'higher_level',
		  'special',
		].includes(parentProperty)
  ) {
    // check if an identical templateData value already exists in potentialDuplicates
    if (!Object.keys(potentialDuplicates).includes(templateData)) {
      // if it's not already there, add templateData value to potentialDuplicates 
      potentialDuplicates[templateData] = `${path}`
      addToLocaleData = true
    } else {
      // if it is there however, use key associated with that templateData value as path
      path = potentialDuplicates[templateData]
    }

    value = `{{ ${path} }}`
  } else if (
    ![
      'alignment',
      'attack_type',
      'dc_success',
      'index',
      'school'
    ].includes(property)
		&& ![
		  'components',
		  'components_required',
		  'damage_at_slot_level',
		  'heal_at_slot_level'
		].includes(parentProperty)
		&& typeof templateData === 'string'
		&& isNaN(templateData)
		&& templateData !== ''
		&& !/^\/?api\//.test(templateData)
		&& !/^([0-9]|[1-9][0-9])?d(|4|6|8|10|12|20|1)((\+|\-)([0-9]|[1-9][0-9]))??$/.test(templateData)
		&& !(['success_type', 'type'].includes(property) && /^[a-z_-]+$/.test(templateData))
  ) {
    // having ignored things we don't want to create translations for,
    // the following translations are ones with keys based on their values
    let templateKey = templateData.sanitize()

    // set this up for when we'll want to add a filter within template tag
    let filterSuffix = ''
    addToLocaleData = true

    if (
      [
        'blindsight',
        'capacity',
        'casting_time',
        'darkvision',
        'duration',
        'range',
        'size',
        'tremorsense',
        'truesight',
        'unit',
        'count',
      ].includes(property)
				|| parentProperty === 'speed'
    ) {
      // handle everything that we'll consider `measurement` related

      // determine if there are any numeric values in templateData
      // const matches = [...templateData.matchAll(/\d{1,4}/g)]
      const numberRegex = /(\d*\.?\d+|\d{1,3}(?:,\d{3})*(?:\.\d+)?)(?!\S)/g
      const matches = Array.from(templateData.matchAll(numberRegex), i => i[0])

      // replace any numeric values in template key with incrementing variables
      templateKey = templateData.replaceWithVariables(numberRegex).sanitize()

      // replace any numeric values in value with incrementing variables
      templateData = templateData.replaceWithVariables(numberRegex, true)

      // set path to templateKey within `measurements` in common domain
      path = `common.measurements.${templateKey}`

      // for each matching numeric value, add a replace filter with variable and captured number
      filterSuffix = matches.length
        ? matches
          .map((match, matchIndex) => {
            return ` | replace: '{{ ${matchIndex.toVariable()} }}', '${match}'`
          }).join('')
        : ''

      value = `{{ ${path}${filterSuffix} }}`
    } else if (
      [
        'damage_resistances',
        'damage_vulnerabilities',
        'damage_immunities'
      ].includes(parentProperty)
				|| property === 'languages'
    ) {
      // handle any values interpreted as comma/and separated lists,
      // mainly `damage types` and `languages`

      // since we want to add each list item separately,
      // we'll prevent adding to locale data after end of these conditions
      addToLocaleData = false

      // set path to current property in common domain
      path = `common.${property === 'languages' ? property : 'damage_types'}`
			
      // determine if list contains `and`
      const hasAnd = / and /.test(templateData)

      // determine if list contains `and with oxford comma`
      const hasOxfordComma = /, and /.test(templateData)

      // split list by `and with oxford comma`, `and` and `comma` and parse results
      const values = templateData.split(/, and | and |, /g)
        .map(result => {
          // check if an identical result value already exists in potentialDuplicates (allow capitalized variations)
          if (potentialDuplicates[_.capitalize(result)] || potentialDuplicates[result]) {
            let duplicate = potentialDuplicates[result]
            let filter = ''

            // add lowercase filter to any duplicate specifically matching a capitalized variation
            if (potentialDuplicates[_.capitalize(result)] && !potentialDuplicates[result]) {
              duplicate = potentialDuplicates[_.capitalize(result)]
              filter = ' | downcase'
            }

            return `{{ ${duplicate}${filter} }}`
          } else {
            const key = result.sanitize()

            // add result value to potential duplicates
            potentialDuplicates[result] = `${path}.${key}`

            // set result value in locale data
            promises.push(lodashSetAsync(localeData, `${path}.${key}`, Promise.resolve(result)))

            return `{{ ${path}.${key} }}`
          }
        })

      // set value to comma separated string of parsed values
      value = values.join(', ')

      if (hasAnd) {
        value = values
        // set value to comma/and separated string of parsed values (with conditional oxford comma)
          .makeCommaSeparatedString(hasOxfordComma)
      }
    } else if (
      [
        'armor_category',
        'category_range',
        'tool_category',
        'vehicle_category',
        'weapon_category',
        'weapon_range',
      ].includes(property)
    ) {
      // handle everything that we'll consider `equipment properties`
      path = `common.equipment_properties.${templateKey}`
    } else if (
      [
        'notes',
        'typical_speakers',
        'script',
        'subclass_flavor'
      ].includes(property)
				|| parentProperty === 'typical_speakers'
    ) {
      // handle cases where we just need to simplify path based on property or parentProperty
      path = `common.${parentProperty === 'typical_speakers' ? parentProperty : property}.${templateKey}`
    } else if (
      (
        !Number.isInteger(property)
				&& property.match(/type/)
				|| parentProperty.match(/types/))
				&& ![
				  'personality_traits',
				  'ability-scores',
				  'equipment-categories',
				  'ability_bonuses'
				].includes(templateData)
    ) {
      // handle everything that we'll consider `various types`
      path = `common.various_types.${templateKey}`
    } else {
      // this should make us aware of anything we haven't deliberately ignored or handled
      console.log(`This wasn't caught by any of our conditions: ${path} ${templateData}`)
    }
  }

  if (addToLocaleData) {
    // unless default behavior is prevented, add templateData to localeData
    promises.push(lodashSetAsync(localeData, path, Promise.resolve(templateData)))
  }

  // overwrite current templateData with value determined by previous conditions
  promises.push(setAsync(context, property, Promise.resolve(value)))

  return Promise.all(promises)
}

const parseSourceData = async (templateData, property, context, localeData, path, potentialDuplicates, domains) => {
  // convert numeric indeces to named keys for path where possible
  property = Array.isArray(context) && context.every(i => i.index) ? templateData.index.replace(/-/g, '_') : property

  // set up default currentPath from path and property
  let currentPath = [path, property].filter(item => item || item === 0).join('.')

  // reset currentPath if property is a domain (or a variation of it)
  if (['proficiency_choices', ...domains].includes(property)) {
    currentPath = property === 'proficiency_choices' ? 'proficiencies' : property
  }

  if (templateData && Array.isArray(templateData)) {
    await Promise.all(templateData.map((item, index) => parseSourceData(item, index, templateData, localeData, currentPath, potentialDuplicates, domains)))
  } else if (templateData && typeof templateData === 'object') {
    if (isLikelyAReference(templateData)) {
      // construct currentPath from url property if object is likely a reference
      currentPath = templateData.url
        .replace(/\/?api\//, '')
        .split('/')
        .map(i => i.replace(/-/g, '_'))
        .join('.')
    }

    await Promise.all(Object.keys(templateData).map(key => parseSourceData(templateData[key], key, templateData, localeData, currentPath, potentialDuplicates, domains)))
  } else {
    await separate(templateData, property, context, localeData, currentPath, potentialDuplicates, domains)
  }
}

// write template to file
const outputTemplate = (templateData, fileName) => {
  const templateOutput = JSON.stringify(templateData, null, 2)

  // create templates directory, if it doesn't already exist
  if (!fs.existsSync('multilingual-support/templates')) {
    fs.mkdirSync('multilingual-support/templates')
  }

  // write templates data to files with original filenames
  fs.writeFile(`multilingual-support/templates/${fileName}`, templateOutput, 'utf8', e => e ? console.error(e) : null)
}

// write source locale to file
const outputSourceLocale = (localeData) => {
  const localeOutput = JSON.stringify(localeData, null, 2)

  // write translations data to source locale file
  fs.writeFile('multilingual-support/source-locale.json', localeOutput, 'utf8', e => e ? console.error(e) : null)
}

// get all files in source folder
fs.readdir('src', (error, fileNames) => {
  if (error) {
    return console.log(error)
  }

  // filter out non source files and save traits and monsters for last to make duplicate prevention result in more desirable keys
  fileNames = fileNames
    .filter(fileName => fileName.startsWith('5e-SRD-'))
    .sort((a) => !a.match(/Monsters|Traits/) ? -1 : 1)
	
  // create domains by parsing file names
  const domains = fileNames.map(fileName =>
    fileName
      .replace('5e-SRD-', '')
      .replace('.json', '')
      .split('-')
      .join('_')
      .toLowerCase()
  )

  // set up object to store locale data in
  const localeData = {
    common: {
      delimiters: {
        and: ' and ',
        andWithOxfordComma: ', and ',
      }
    },
  }

  // set up object for all translation values and keys that we can use to identify duplicates
  const potentialDuplicates = {}

  const promises = fileNames.map((fileName, fileIndex) => {
    return readFile(`src/${fileName}`)
      .then(sourceFileContents => {
        const templateData = JSON.parse(sourceFileContents)

        return Promise.resolve(parseSourceData(templateData, null, null, localeData, domains[fileIndex], potentialDuplicates, domains))
          .then(() => outputTemplate(templateData, fileName))
          .catch(e => console.error(e))
      })
  })
	
  Promise.all(promises).then(() => outputSourceLocale(localeData))
})
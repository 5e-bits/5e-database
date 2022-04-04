var fs = require('fs')

exports.readFile = async filePath => {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8')

    return data
  }

  catch(e) {
    console.log(e)
  }
}

exports.setAsync = (context, property, pendingValue, localeKey = null) => {
  return pendingValue.then(value => context[property] = localeKey ? { [localeKey]: value } : value)
}
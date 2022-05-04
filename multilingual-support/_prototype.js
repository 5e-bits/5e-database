Number.prototype.toVariable = function() {
  return ((this + 23) % 26 + 10).toString(36)
}

String.prototype.sanitize = function() {
  return this
    .split(/ |\//)
    .filter(string => string)
    .join('_')
    .replace(/[\W\/]+/g, '')
    .toLowerCase()
}

String.prototype.replaceWithVariables = function(match, curlyBrackets = false) {
  let i = 0

  return this
    .replace(match, function() {
      const letter = i.toVariable()
      i++
      return curlyBrackets ? `{{ ${letter} }}` : letter
    })
}

Array.prototype.makeCommaSeparatedString = function(useOxfordComma) {
  const listStart = this.slice(0, -1).join(', ')
  const listEnd = this.slice(-1)
  const conjunction = this.length <= 1 
    ? '' 
    : useOxfordComma && this.length > 2 
      ? '{{ common.delimiters.and_with_oxford_comma }}' 
      : '{{ common.delimiters.and }}'

  return [listStart, listEnd].join(conjunction)
}
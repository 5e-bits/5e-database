# Multilingual support

## Create source locale

A source locale is a json file containing a collection of everything in the current version of the database that would be considered translatable. When you create a source locale, you also create a set of templates containing everything that would not be considered translatable, along with placeholders for the translatable content. To create the source locale and the set of template run:

`npm run create-source-locale`

This will create `multilingual-support/source-locale.json` and `multilingual-support/templates` with the templates inside. The contents of the source locale could then be translated into other languages, either by making copies and editing it as is or by importing it in a translation management system.

## Populate templates

When your source locale has been translated into another language, you can populate the templates with its translations by running this command:

`npm run populate-templates`

This will generate a translated version of the database in `multilingual-support/output`. Running this command with the English source locale should render an identical set of files to the ones in `src`.
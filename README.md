# 5e-database

Holds the database for the D&D 5th Edition API at http://dnd5eapi.co/

There are two helper files at the moment
* helper.js
* urlprinter.js

# helper.js
 
example command:
```
node helper features
```
* creates an upload file for the features collection
* automatically reindexes and creates URL's for each JSON object
* prints out a mongodb command to upload the database to MongoLab
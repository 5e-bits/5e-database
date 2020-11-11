# 5e-database
[![Build Status](https://travis-ci.com/bagelbits/5e-database.svg?branch=master)](https://travis-ci.com/bagelbits/5e-database)
[![Discord](https://img.shields.io/discord/656547667601653787)](https://discord.gg/TQuYTv7)

Holds the database for the D&D 5th Edition API at http://dnd5eapi.co/

Talk to us [on Discord!](https://discord.gg/TQuYTv7)

# How to run

## With Docker
You should be able to build locally and then run the local Docker image.

## Without Docker
First you need to make sure you have [MongoDB installed locally.](https://docs.mongodb.com/manual/installation/)

You can load this data locally by running:
```
MONGODB_URI=mongodb://localhost/5e-database npm run db:refresh
```

# API Issues
If you see anything wrong with the API and not the data, please open an issue or PR over [here](https://github.com/bagelbits/5e-srd-api).

# Contributing
 * Fork this repository
 * Create a new branch for your work
 * Push up any changes to your branch, and open a pull request. Don't feel it needs to be perfect — incomplete work is totally fine. We'd love to help get it ready for merging.

# License
This project is licensed under the terms of the MIT license. The underlying material
is released using the [Open Gaming License Version 1.0a](https://www.wizards.com/default.asp?x=d20/oglfaq/20040123f)

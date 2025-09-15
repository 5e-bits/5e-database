# [4.1.0](https://github.com/5e-bits/5e-database/compare/v4.0.0...v4.1.0) (2025-09-15)


### Features

* **2024:** Adding equipment and equipment categories ([#860](https://github.com/5e-bits/5e-database/issues/860)) ([15fb5eb](https://github.com/5e-bits/5e-database/commit/15fb5ebeb2eed406bd97e8ea566a67a59793b340))

# [4.0.0](https://github.com/5e-bits/5e-database/compare/v3.26.1...v4.0.0) (2025-09-04)


* refactor(race/subrace)!: remove redundant data ([#875](https://github.com/5e-bits/5e-database/issues/875)) ([67261fb](https://github.com/5e-bits/5e-database/commit/67261fbf4b1c5c785aeab47fbd4356c328b0593c)), closes [#874](https://github.com/5e-bits/5e-database/issues/874)


### BREAKING CHANGES

* dropped the `race.starting_proficiencies`,
`race.starting_proficiency_options`, `subrace.starting_proficiencies`,
`subrace.language_options`, and `subrace.languages` properties of all
races and subraces in the database. Clients can instead find this data
on the corresponding traits linked to each race or subrace.

## How was it tested?

I ran the database + API project locally with Docker and called the
endpoints of the various classes and subclasses. I also ran the unit and
integration tests in the API project.

## Is there a Github issue this is resolving?

## [3.26.1](https://github.com/5e-bits/5e-database/compare/v3.26.0...v3.26.1) (2025-06-30)


### Bug Fixes

* **trident:** change damage type to piercing ([#865](https://github.com/5e-bits/5e-database/issues/865)) ([84c2fe6](https://github.com/5e-bits/5e-database/commit/84c2fe653ecbfd9e51fb2755b922d17ce412889c))

# [3.26.0](https://github.com/5e-bits/5e-database/compare/v3.25.1...v3.26.0) (2025-06-13)


### Features

* **2024:** Add a bunch of easy tables to 2024 ([#856](https://github.com/5e-bits/5e-database/issues/856)) ([40ec703](https://github.com/5e-bits/5e-database/commit/40ec703049aadb25607e44843c9afcafd5ce1b86))

## [3.25.1](https://github.com/5e-bits/5e-database/compare/v3.25.0...v3.25.1) (2025-05-16)


### Bug Fixes

* Add subclass improvements to level features ([#836](https://github.com/5e-bits/5e-database/issues/836)) ([0907a8a](https://github.com/5e-bits/5e-database/commit/0907a8a18d7d92b8ba91d23e0c076d0598caebc8))

# [3.25.0](https://github.com/5e-bits/5e-database/compare/v3.24.0...v3.25.0) (2025-05-04)


### Features

* **images:** Redirect image urls to new image urls ([#826](https://github.com/5e-bits/5e-database/issues/826)) ([be7e6aa](https://github.com/5e-bits/5e-database/commit/be7e6aad5c66e588af81730ead77480b0925720b))

# [3.24.0](https://github.com/5e-bits/5e-database/compare/v3.23.0...v3.24.0) (2025-04-28)


### Features

* **magic-items:** Images for Deck of Many Things to Elemental Gems ([1936368](https://github.com/5e-bits/5e-database/commit/19363688c37cff32175f8784a54bbcf3182924ed))

# [3.23.0](https://github.com/5e-bits/5e-database/compare/v3.22.0...v3.23.0) (2025-04-28)


### Features

* **magic-items:** Images for Boots of striding and sprinting to Deck of Illusions ([46155eb](https://github.com/5e-bits/5e-database/commit/46155ebea6594ef9864dfd329bb45b63668b4c8e))

# [3.22.0](https://github.com/5e-bits/5e-database/compare/v3.21.0...v3.22.0) (2025-04-27)


### Features

* **images:** All remaining monster images ([4805d07](https://github.com/5e-bits/5e-database/commit/4805d07e433cd2fa4be82990bfe434ef40843086))

# [3.21.0](https://github.com/5e-bits/5e-database/compare/v3.20.0...v3.21.0) (2025-04-27)


### Features

* **images:** Hezrou to Manticore, Warhorse Skeleton, and Werebear to White Dragon Wyrmling ([3f54cae](https://github.com/5e-bits/5e-database/commit/3f54caeacceeb38b351424cbc7f6653b926c6ae4))

# [3.20.0](https://github.com/5e-bits/5e-database/compare/v3.19.2...v3.20.0) (2025-04-27)


### Features

* **release:** Remove PAT dependency ([#818](https://github.com/5e-bits/5e-database/issues/818)) ([aefc47e](https://github.com/5e-bits/5e-database/commit/aefc47eb420b58a3b746d68148a5ce93073cf627))

## [3.19.2](https://github.com/5e-bits/5e-database/compare/v3.19.1...v3.19.2) (2025-04-27)


### Bug Fixes

* **monsters:** white spaces, OCR, etc. ([#816](https://github.com/5e-bits/5e-database/issues/816)) ([30913dd](https://github.com/5e-bits/5e-database/commit/30913dd4d4295f3017a148d3f9c3cb6ae2b49a9b))

## [3.19.1](https://github.com/5e-bits/5e-database/compare/v3.19.0...v3.19.1) (2025-04-27)


### Bug Fixes

* **images:** Add image for Grick ([cf5105d](https://github.com/5e-bits/5e-database/commit/cf5105d99637a0e89480b7bca8a6d08e934bd2bf))

# [3.19.0](https://github.com/5e-bits/5e-database/compare/v3.18.0...v3.19.0) (2025-04-27)


### Features

* **images:** Duergar to Ghost ([2460333](https://github.com/5e-bits/5e-database/commit/24603330712099ea478a61c9924a262d43a06fb2))
* **images:** Ghoul to Hell Hound ([7061e7f](https://github.com/5e-bits/5e-database/commit/7061e7f0237527de06c46426ab965595faa75fdf))

# [3.18.0](https://github.com/5e-bits/5e-database/compare/v3.17.0...v3.18.0) (2025-04-26)


### Features

* **images:** Cultist to Druid ([92d2db9](https://github.com/5e-bits/5e-database/commit/92d2db94de4a4fae89a8aa99804759c0487bcd54))

# [3.17.0](https://github.com/5e-bits/5e-database/compare/v3.16.0...v3.17.0) (2025-04-25)


### Bug Fixes

* **npm:** Set to private so we don't publish to npm ([08e582a](https://github.com/5e-bits/5e-database/commit/08e582a848e89c7cd79bd1373332d427c4413663))
* **npm:** Update npm lockfile ([9fdcf7d](https://github.com/5e-bits/5e-database/commit/9fdcf7dd941856bfe042972598317573e7a8bcb9))


### Features

* **release:** Now create CHANGELOG.md and npm version bump with semantic release ([935a3c6](https://github.com/5e-bits/5e-database/commit/935a3c6dce3b7197b563b8f0be279670ba0f4076))

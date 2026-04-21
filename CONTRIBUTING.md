# Contributing to 5e-database

Thanks for helping improve the 5e SRD database! This guide covers the two main ways to contribute: **data corrections** and **translations**.

---

## General workflow

1. Fork this repository
2. Create a branch for your changes
3. Open a pull request — incomplete work is welcome, we can help get it ready

We use [Semantic Release](https://semantic-release.gitbook.io/semantic-release/), so please follow conventional commit message conventions for your PR title:

| PR title prefix                       | Effect        |
| ------------------------------------- | ------------- |
| `fix(...)`                            | Patch release |
| `feat(...)`                           | Minor release |
| `feat(...) + BREAKING CHANGE:` footer | Major release |

---

## Correcting English data

English source files live in `src/{year}/en/`. Edit the appropriate `5e-SRD-{Collection}.json` file and open a PR. CI will validate your changes automatically.

---

## Contributing translations

Translations are entirely community-driven. Adding a translation requires no database access or special tooling — only a text editor and a fork.

### File location

Create a file at:

```
src/{year}/{lang}/5e-SRD-{Collection}.json
```

where `{lang}` is a [BCP 47](https://www.rfc-editor.org/rfc/rfc5646) language tag (e.g. `de`, `fr`, `pt-BR`, `es-419`, `zh-Hans`).

**Examples:**
```
src/2014/de/5e-SRD-Spells.json
src/2024/fr/5e-SRD-Equipment.json
src/2024/pt-BR/5e-SRD-Conditions.json
```

### File format

A translation file is a JSON array. Each entry must include `index` (to identify the source record) plus **only the fields you are translating**. You do not need to include every entry or every field — partial translations are fully supported.

```json
[
  {
    "index": "acid-arrow",
    "name": "Säurepfeil",
    "desc": [
      "Ein glitzernder grüner Pfeil schießt auf ein Ziel..."
    ],
    "higher_level": [
      "Wenn du diesen Zauber mit einem Zauberplatz der 3. Stufe oder höher wirkst..."
    ]
  }
]
```

### Translatable fields

Only text fields may be translated. Structural fields (`url`, numeric values, and API references) must be omitted. `index` is required for matching but must not be translated — its value must be identical to the English source. The exact set of translatable fields depends on the collection — any text field present in the English entry for that `index` is allowed.

The table below shows common examples from the Spells collection:

| Field                 | Translatable                                                |
| --------------------- | ----------------------------------------------------------- |
| `name`                | Yes                                                         |
| `desc`                | Yes                                                         |
| `higher_level`        | Yes                                                         |
| `index`               | No — include it for matching, but don't translate its value |
| `url`                 | No                                                          |
| Numeric values        | No                                                          |
| API reference objects | No                                                          |

Other collections expose different text fields (e.g. `summary` on subclasses, `description` on some entries). Include any text field that appears in the English source — CI will reject fields that don't exist there.

### Validation rules

CI will reject translation PRs that:

- Include an `index` that does not exist in the corresponding English file
- Include a field that does not exist in the English entry for that `index`
- Contain duplicate `index` values within a single file
- Fail Zod schema validation when translation fields are merged with the English entry

Run `npm test` locally before opening a PR to catch these issues early.

### Partial translations are fine

You do not need to translate every entry or every field. The API will fall back to English on a per-field basis for anything not covered by a translation. A file covering even a handful of entries is a useful contribution.

---

## Code of Conduct

See the [Code of Conduct](https://github.com/5e-bits/5e-database/wiki/Code-of-Conduct).

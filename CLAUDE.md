# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a D&D 5th Edition database repository that feeds into the D&D 5e API (http://dnd5eapi.co/). It contains JSON data files for game content (races, classes, spells, monsters, etc.) that are loaded into MongoDB. The database supports both 2014 and 2024 editions of D&D 5e rules.

## Key Commands

### Development
```bash
npm run lint                    # Run ESLint on all files
npm test                        # Run Vitest tests
npm run coverage                # Run tests with coverage report
npm run build:ts                # Compile TypeScript scripts in scripts/ directory
```

### Database Operations
```bash
# Load all JSON data into MongoDB (full refresh)
MONGODB_URI=mongodb://localhost/5e-database npm run db:refresh

# Update specific collections
MONGODB_URI=mongodb://localhost/5e-database npm run db:update
```

### Docker
```bash
# Build and run locally
docker build -t 5e-database .
docker run -i -t 5e-database:latest

# Run pre-built image (non-M1)
docker run ghcr.io/5e-bits/5e-database:latest
```

## Architecture

### Data Structure

- **`src/2014/`** - Contains all 2014 edition JSON files (25 files)
- **`src/2024/`** - Contains 2024 edition JSON files (partial set, 10 files)
- All JSON files follow naming convention: `5e-SRD-{CollectionName}.json`

### Source Attribution System

Every item in the database includes a `"source"` field to distinguish content origin:
- `"source": "srd"` - Official SRD content (all existing items)
- `"source": "homebrew-base"` - First wave of custom homebrew content
- Future sources: `"homebrew-space"`, `"homebrew-christmas-edition"`, etc.

This field allows filtering and querying by content type.

### Database Scripts

Located in `scripts/` directory (TypeScript):

- **`dbRefresh.ts`** - Drops all collections and reloads from JSON files
- **`dbUpdate.ts`** - Updates specific collections without dropping
- **`dbUtils.ts`** - Shared utilities for database operations:
  - Collection name extraction from file paths
  - Index management
  - MongoDB URI validation

### Collection Naming

JSON files are converted to MongoDB collections with prefixes based on edition:
- `src/2014/5e-SRD-Ability-Scores.json` → `2014-ability-scores` collection
- `src/2024/5e-SRD-Skills.json` → `2024-skills` collection

The scripts automatically handle this conversion using the parent directory name.

### JSON File Structure

Each JSON file contains an array of game objects. Common fields:
- `index` - Unique identifier (kebab-case)
- `name` - Display name
- `url` - API endpoint path
- `source` - Content origin (srd/homebrew-base/etc.)
- Additional fields vary by content type

Example subraces structure:
```json
{
  "index": "forge-dwarf",
  "name": "Forge Dwarf",
  "source": "homebrew-base",
  "race": { "index": "dwarf", "name": "Dwarf", "url": "/api/2014/races/dwarf" },
  "desc": "Description text...",
  "ability_bonuses": [...],
  "starting_proficiencies": [...],
  "racial_traits": [...]
}
```

## Contributing Guidelines

### Commit Message Format

This project uses Semantic Release. Follow these conventions:

- `feat(scope): description` - Minor feature release
- `fix(scope): description` - Patch fix release
- `perf(scope): description` with `BREAKING CHANGE:` footer - Major release

**Important**: Do NOT include AI attribution in commit messages or pull request descriptions. Commits should be attributed to the human developer only. Do not add phrases like "Generated with Claude Code", "Co-Authored-By: Claude", or similar AI credits.

### Adding Homebrew Content

1. Add new entries to appropriate JSON files in `src/2014/` or `src/2024/`
2. Set `"source": "homebrew-base"` (or appropriate homebrew variant)
3. Follow existing structure and naming conventions
4. Ensure `index` values are unique and use kebab-case
5. Test with `npm run db:refresh` before committing

### Copyright Considerations

- SRD content is safe to include
- Homebrew content must be sufficiently different from copyrighted WotC material
- Avoid using exact stat blocks or descriptions from non-SRD sources
- Change names, mechanics, and flavor text to create legally distinct content

## MongoDB Requirements

- MongoDB must be installed locally for development, or use MongoDB Atlas
- Set `MONGODB_URI` environment variable before running database scripts
- Default: `mongodb://localhost/5e-database`
- Database operations create/update collections with edition-specific prefixes
- For local development, connection string can be stored in `.env` file (not tracked in git)

## MongoDB MCP Integration

This project has MongoDB MCP (Model Context Protocol) configured for Claude Code. The MCP server enables:
- Direct database queries using natural language
- CRUD operations on collections
- Schema inspection and collection management
- Atlas cluster management (with API credentials)

The MCP is configured to connect to MongoDB Atlas using the connection string from environment variables.

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) automatically:

1. **On Pull Requests**: Runs lint and tests
2. **On Push to Main**:
   - Runs lint and tests
   - Deploys database changes using `npm run db:update`
   - Creates semantic releases
   - Builds and publishes Docker container
   - Triggers downstream API updates

**Important**: The deploy step requires `MONGODB_URI` to be set as a GitHub repository secret at Settings → Secrets and variables → Actions.

## Manual Database Operations

If automatic deployment fails or you need to manually refresh the database:

1. **Via GitHub Actions**: Go to Actions tab → "Manual Database Refresh" → Run workflow
2. **Locally**: `MONGODB_URI=<your-connection-string> npm run db:refresh`

Note: `db:refresh` drops all collections and reloads, while `db:update` only updates changed collections.

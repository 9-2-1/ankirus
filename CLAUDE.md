# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ankirus is a visualization tool for Anki flashcards that displays card state metrics (difficulty, stability, retention) via a TreeMap interface. It helps users understand and manage their Anki learning progress.

## Architecture

### Backend (Python)

- **Framework**: aiohttp async web server
- **Entry Point**: `python -m backend --config <config-file>`
- **Main Class**: `backend/app.py:App` - Sets up routes and runs HTTP server on configured port

**Key Components:**

- `backend/services/anki_reader.py:AnkiCachedReader` - Reads Anki SQLite database
  - Anki DB is locked during use, so it's copied to `tmp_db` first (including -wal file)
  - Caches card data with TTL to avoid repeated reads
  - Handles timezone offset and rollover for due time calculations
- `backend/services/sanitizer.py:TextSanitizer` - Filters banned words from card content
  - Uses SQLite cache database to avoid re-filtering
  - Loads banned words from `banned_words.txt`
- `backend/routes/cards.py` - API endpoints (`/cards/`, `/cards/due/`)
- `backend/models/card.py:Card` - Data model for card information

### Frontend (Svelte 5 + TypeScript + D3.js)

- **Framework**: Svelte 5 with TypeScript using new `$state`/`$derived` runes
- **Build**: Vite with @sveltejs/vite-plugin-svelte
- **Visualization**: D3.js for TreeMap visualization

**Key Components:**

- `frontend/src/App.svelte` - Main application with reactive state
- `frontend/src/components/TreeMap.svelte` - D3.js-based card visualization
- `frontend/src/components/CardPreview.svelte` - Card details display
- `frontend/src/components/GroupList.svelte` - Hierarchical group tree
- `frontend/src/components/Layout.svelte` - Responsive layout (sidebar treemap + main preview)
- `frontend/src/utils/groupParser.ts` - Parses API response into CardData
- `frontend/src/utils/groupListBuilder.ts` - Builds hierarchical group list

**Data Flow:**

Frontend fetches from `/cards/` → Returns array of `{group: string[]} | {time, difficulty, stability, decay, front, back, paused?}` → Parsed into CardData with computed retention rate → Visualized in TreeMap

## Commands

### Backend

```bash
# Development
python -m backend --config config.json

# Test mode (reads cards, prints result)
python -m backend --test --config config.json

# Production (uses prod.json and system venv)
./run

# Initial setup
./setup  # Installs requirements.txt, creates data directory
```

### Frontend

```bash
# Development server (proxies /cards to localhost:24032)
npm run dev

# Build for production
npm run build

# Type check and lint
npm run lint   # svelte-check + eslint

# Format code
npm run format # prettier
```

### Full Stack (Windows)

```cmd
setup.cmd  # pnpm install && build
```

## Configuration

`config.json` (or `prod.json`):

```json
{
  "media": "collection.media/",          // Anki media directory path
  "userprofile": "/path/to/anki/",       // Anki profile directory
  "tmp_db": "tmp-collection.anki2",      // Temporary DB copy location
  "cachedb": "cache.db",                 // Sanitizer cache DB
  "port": 24032,                         // HTTP server port
  "cache_ttl": 86400,                    // Card data cache TTL (seconds)
  "banned_words": "banned_words.txt",   // Path to banned words file
  "enable_sensitive_word_filter": true, // Enable TextSanitizer
  "enable_statistics": true,
  "enable_cache": true
}
```

## Important Notes

**Anki Database Access**: Anki locks its SQLite database while running. The AnkiCachedReader copies both `collection.anki2` and `collection.anki2-wal` to a temporary location before reading.

**Type Safety**:
- Python: pyright in "standard" mode (`reportUnknownParameterType: true`)
- TypeScript: Run `npm run lint` which uses `svelte-check` and `eslint`
- Function parameters must be typed; return types should be typed for complex functions
- Prefer `as Type` over `any` when dealing with untyped external libraries
- For missing type definitions, install `@types/*` packages or create `.d.ts` files

**Code Style** (from AGENTS/AGENTS.md):
- Define readable, well-named functions and components for repetitive operations
- Split complex functions into smaller, named functions for readability
- Use `$state` and `$derived` runes in Svelte 5 (not `let` variables for reactivity)
- Handle linting errors by checking: data issues, incorrect function calls, or incorrect type annotations

**Frontend Build**: The dev server proxies `/cards` requests to `http://localhost:24032`. In production, the backend serves static assets from `frontend/dist/assets/` and Anki media files from the configured media directory.

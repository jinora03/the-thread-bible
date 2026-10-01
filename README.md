# The Thread Bible

An interconnected Bible study library, built on one idea: **help readers see how Scripture connects to Scripture.** That includes promise and fulfillment, type and antitype, quotation and allusion, and doctrine and its supporting passages.

This repository contains the web app, its API, and the editorial content. They live in one repo and share their types.

## Getting started

Requires **Node 22.22+**.

```bash
npm install
cp .env.example .env      # then set BETTER_AUTH_SECRET (the file explains how)
npm run setup             # downloads KJV + BSB from eBible.org (~5.5 MB) and imports them
npm run dev               # web on http://localhost:5173, API on :8787 (proxied at /api)
```

`npm run setup` only needs to run once. Re-run `npm run scripture:import` after changing the USFM parser.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | API (restarts on changes to `server/`, `shared/`, `content/`) and Vite, side by side |
| `npm run build` | Type-check everything (`tsc -b`), then build the frontend into `dist/` |
| `npm start` | Production: one Node process serving the API and `dist/` (run `build` first) |
| `npm test` | Unit, integration, and component tests (Vitest) |
| `npm run test:e2e` | Browser tests and axe accessibility checks (Playwright; see below) |
| `npm run lint` | oxlint with the react, typescript, and jsx-a11y rules |
| `npm run content:check` | Validates every file in `content/`, checks every reference against the Bible text, and reports what production would show. Fails on invalid content |
| `npm run content:check:release` | The same, and also fails if production would show no study content or hide the home page's featured items. Run before deploying |
| `npm run scripture:fetch` / `scripture:import` | The two halves of `setup` |
| `npm run db:generate` | Generate a Drizzle migration after changing `server/db/schema.ts` |

## Architecture

```
shared/   isomorphic code, used by both sides: domain types, the 66-book canon,
          the reference parser/formatter, rich-text tokens, Zod schemas
server/   Hono API on Node: SQLite (better-sqlite3 + Drizzle), FTS5 search,
          Better Auth, the content loader, Scripture providers
src/      React app: routes with data loaders, TanStack Query, the design system
content/  editorial content as YAML, validated on load (see content/README.md)
data/     runtime data, gitignored: the SQLite database and downloaded sources
e2e/      Playwright specs
```

**The API** is built by `createApp()` in `server/app.ts`, with every dependency injected. The integration tests run it against an in-memory database. Routes:
- `/api/scripture`: translations, chapters, and passages
- `/api/content`: entities, collections, chapter study notes, the home page
- `/api/search`: grouped and faceted results with highlights
- `/api/library`: the signed-in reader's bookmarks, notes, and progress
- `/api/auth/*`: Better Auth

Errors are always JSON of the form `{ error: { code, message } }`. The UI switches on `code` (for example, `chapter_not_available` or `entity_not_found`) to show specific states.

**Scripture** comes from providers behind one registry (`server/scripture/`):
- The `local` provider reads the public-domain KJV and BSB from SQLite. They're imported from eBible.org USFM, keeping paragraphs, section headings, psalm titles, and poetic lines.
- The optional `api-bible` provider adds licensed translations (see below).

Editorial content never embeds Scripture text. It stores references, and the text is resolved in the reader's chosen translation.

**Search** uses SQLite FTS5 (porter stemming, bm25 ranking) over verses and an in-memory index of the content.
- Reader input is turned into a safe query (`server/search/fts.ts`). Operators are never interpreted.
- Function words like "of" and "the" only count inside "quotes".
- Snippets come back as plain `{ text, match }` segments. Nothing is rendered as HTML.
- A query that names a passage ("rom 8:28") or a book gets a **Go to** result. The palette recognizes these instantly, on the client, using the same shared code.

**Accounts and the library:**
- Accounts are email + password (Better Auth), with HTTP-only session cookies.
- Signed out, the library (bookmarks, notes, and reading progress) lives in `localStorage`. A save the browser refuses (storage full or disabled) is reported, not shown as saved. Stored items that can't be read are set aside, and offered for download on the Library page, instead of erasing the rest.
- While signed in, anything in the browser library is imported into the account. Only what was sent is then removed from the browser, and a failed import keeps everything there and offers a retry.
- Each account's library is cached separately (`['library', userId]`), and responses that arrive after sign-out are dropped, so one reader's data never appears in another's view.
- Changes show immediately and are confirmed by the server. A failed change undoes only itself, and the note editor stays open with the draft until a save succeeds.
- **Validation is shared** (`shared/schemas`): references must name a real book, chapter and verse range, and the API also checks verses against the imported text. Notes, timestamps, study ids and import sizes follow one set of rules in the form, the API and browser storage.

**The frontend:**
- Routes load their data in React Router loaders, via `queryClient.ensureQueryData`, so navigation never waterfalls. The reader also prefetches the next chapter.
- Selected verses live in the URL hash (`/bible/isaiah/53#v4-6`), so every selection is a shareable link.

## Content and review

Content lives in `content/`, one YAML file per entry. Every file carries a `review` block whose `status` moves from `draft` to `in-review` to `published`. Published entries must record at least one completed review. See [content/README.md](content/README.md) for the formats.

`CONTENT_STAGE` decides what is served:
- `preview` (the development default) serves everything and labels unreviewed entries in the UI.
- `published` (the production default) serves only published entries. Connections to hidden entries are dropped.

**All current content is sample material marked `in-review`.** A production build therefore serves Scripture, search and the library, but no study content, until entries have been reviewed and published:
- Readers see "in preparation" messages where content would be, not broken pages.
- The server logs a warning at startup when nothing is published.
- `npm run content:check` reports what production would show, collection by collection. `npm run content:check:release` fails until it is ready.
- Content is never published automatically. Publishing means recording a completed review in the file (see [content/README.md](content/README.md)).

## Data and privacy

- **Account data lives only in the database** (`data/thread-bible.db` by default): users, hashed passwords, sessions, bookmarks and notes. Database files (`*.db`, `*.sqlite`, and their `-wal`/`-shm` sidecars) are gitignored wherever they are, and so is `.env`.
- **The Scripture text is reproducible,** so never share a database to share the Bible text: `npm run setup` downloads and imports it from eBible.org.
- **Share the project through Git** (or GitHub's "Download ZIP"), not by zipping the folder. Those include only committed files, so `data/` and `.env` stay out.
- If a database or `.env` was ever shared, generate a new `BETTER_AUTH_SECRET` (it signs sessions), and, for a live deployment, revoke existing sessions.
- The end-to-end tests run on a copy of the development database with every account removed (see `e2e/serve-api.ts`).

## Translations and licensing

- **KJV** (1769 text): public domain outside the United Kingdom, where rights are vested in the Crown.
- **BSB**: dedicated to the public domain in 2023.
- Both are imported from [eBible.org](https://ebible.org) USFM files.
- **API.Bible (optional).** Set `API_BIBLE_KEY` and `API_BIBLE_BIBLES` (pairs of `ourId:bibleId`) in `.env`, and those translations join the switcher. Licensed text comes with the publisher's terms. Before any production use:
  - Show the returned copyright line. The reader already does this.
  - Respect caching limits. The adapter keeps a small in-memory cache.
  - Implement **FUMS** usage reporting, which is not implemented yet.
  - The adapter has only been tested against recorded responses, not the live API.

## Testing

- **`npm test`** has two Vitest projects:
  - `node`: shared and server code, including the USFM parser, search queries, content validation, the API.Bible adapter (with a fake `fetch`), and the whole API run in memory, covering sign-up and the library.
  - `dom`: components in jsdom, covering ScriptureText, chapter-grid keyboard navigation, note validation, and the persistent store.
- **`npm run test:e2e`** runs Playwright against a production build and its own API on ports 5174 and 8788. The API uses a fresh copy of the development database in `data/e2e/`, so test accounts never reach your real database. Run `npm run setup` first.
  - Flows covered: reading, switching translation, selecting ranges, search and the command palette, and a signed-out library syncing into a new account.
  - axe checks cover every main page in light and dark themes, at desktop and mobile sizes.
  - It uses the installed Microsoft Edge (`channel: 'msedge'`), so no browser download is needed. Elsewhere, run `npx playwright install chromium` and set `PLAYWRIGHT_CHANNEL=chromium`.

## Design system

- **Tokens** are semantic CSS variables in `src/styles/globals.css`, with light and dark ("quiet study room") themes.
- **Color carries meaning:** burgundy for actions and references, olive for historical context, antique gold (`--thread`) for connections.
- **Typography rule: serif body text always means Scripture.** Source Serif 4 is used for Scripture and headings, and Geist for interface text and commentary. Scripture is set at 18–20px, with 1.8 line height, at a reading measure.
- **Cards** appear only for selectable previews. Everything else is typography, whitespace, and hairlines.
- **Connections show their basis as text:** "Stated in Scripture", "Supported across Scripture", or "Suggested connection". What Scripture states is kept separate from what is offered more cautiously.

# দাম কত? — Dam Koto?

> কেনার আগে জেনে নিন, আপনার এলাকায় দাম কত!

A Bangladesh-wide, community-driven **price intelligence** platform. People share the prices they actually paid (vegetables, rice, oil, fish, eggs, LPG, clothing, electronics…), and anyone can explore, filter, map and compare them by area and date.

**This is not a shop.** There is no cart, checkout, ordering, payment or seller contact — only price reports, comparison and discussion.

## Features

- **Bengali-first UI** with a full English switch (cookie + localStorage persisted; typed translation keys so a missing string fails `tsc`).
- **Add a price** without an account: product (catalog suggestions or any custom name), category, price, quantity, flexible units, package description, optional brand/variant/market/date/condition/note/name/photo. The location is mandatory and can be set three ways: an administrative list (8 divisions, 64 districts, 494 upazilas), a map point, or the device's current location (only when the user asks).
- **Search & filters** backed by real SQL: product name in Bengali or English, catalog aliases (e.g. "alu" finds আলু), trigram fuzzy matching, category/subcategory, brand, variant, unit, condition, division/district/upazila/locality/market, price range (per comparable unit when chosen), today/7/30/90 days or a custom range, has photo/comments/name/market, map area, and six sort orders. All filters live in the URL.
- **Interactive map** (Leaflet + OSM-compatible tiles). It queries the visible area, clusters on the server when there are many points, links markers and list both ways, has a legend, works with the keyboard, and shows only approximate (~100 m) positions.
- **Comparison engine:** min, median, average and max per division/district/upazila/market, with report counts and latest dates. A group with one report is marked as a single report, not an average. Incompatible units, package sizes and brands are never mixed. A weekly-median trend chart is built from real dates only.
- **Report pages** with a freshness label, comparable unit price, an approximate location map, related and nearby prices, sticker reactions, threaded comments (one level of replies, optional name and area, original stickers), sharing, Open Graph metadata, and a "report a problem" flag.
- **Trust & abuse handling:** published/pending/rejected/hidden statuses, optional pre-moderation, duplicate detection, outlier/link/phone/frequency flags (flagged for review, never auto-deleted), a small profanity filter, and database-backed rate limits.
- **Official & regulated prices** (`/official-prices`): staff add prices published by TCB, the Department of Agricultural Marketing, BERC, BPC, DGDA and other bodies, one at a time or by CSV import. Each entry keeps its source, link, area and publication date. Lists older than 30 days are marked, and earlier publications are kept as history. When linked to a catalog product, the official price appears beside community data on report and compare pages, without ever being mixed into community statistics. Nothing is fetched automatically.
- **Moderation dashboard** (`/admin`): stats, review queues for reports, comments and flags, category management, staff roles, settings overview, and an audit log. Every action is authorized on the server.
- **My contributions** for guests (cookie-based ownership). Own reports can be edited or deleted within 48 hours, own comments within 24 hours.
- **SEO:** per-page metadata, canonical URLs, sitemap (published, non-demo reports only) and robots.txt.

## Tech stack

Next.js 16 (App Router, Server Components, Server Actions, Route Handlers) · React 19 · TypeScript (strict) · Tailwind CSS v4 · shadcn-style components (hand-written in `src/components/ui`, native `<dialog>` and selects) · Lucide · React Hook Form + Zod · Recharts · Leaflet / React Leaflet · Drizzle ORM · PostgreSQL (Supabase) / PGlite locally · Supabase Auth (staff) · Cloudinary (optional images) · Vitest · Playwright.

## Quick start (no accounts needed)

```bash
nvm use 24            # Node 20.9+ works; developed on 24
npm install
cp .env.example .env.local
echo "DEV_AUTH_ENABLED=true" >> .env.local   # dev-only staff login
echo "SHOW_DEMO_DATA=true"  >> .env.local    # show labelled sample reports
npm run db:seed:demo  # optional: 120 sample reports, flagged "নমুনা তথ্য"
npm run dev           # http://localhost:3000
```

Without `DATABASE_URL`, the app uses an embedded **PGlite** Postgres in `.data/pglite`. The first time it opens, it runs the migrations and seeds categories, the product catalog and locations. Stop the dev server before running `db:*` scripts against PGlite, because only one process can open it at a time.

To review moderation locally, open `/login` and choose "moderator" or "admin". This only appears when `DEV_AUTH_ENABLED=true` and never in production builds.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` · `npm run lint` | TypeScript, ESLint |
| `npm test` | Vitest unit + integration tests (in-memory PGlite, real migrations) |
| `npm run test:e2e` | Playwright; starts its own isolated dev server and database (`npx playwright install chromium` first) |
| `npm run check` | typecheck + lint + tests |
| `npm run db:generate` | Generate a migration from `src/db/schema.ts` |
| `npm run db:migrate` | Apply `supabase/migrations` to `DATABASE_URL` |
| `npm run db:seed` | Reference data only (safe for production, never inserts prices) |
| `npm run db:seed:demo` | Labelled demo reports (PGlite; refuses a real DB unless `ALLOW_DEMO_SEED=true`) |

## Project structure

```
src/
  app/                 routes: pages, layouts, route handlers (api/*), sitemap, robots
  components/          layout (header, footer, nav, language switcher), ui primitives, shared states
  features/
    auth/              permission rules, login/locale actions
    categories/        category tree, catalog matching, suggestions
    comments/          comment service/actions, stickers, reactions, flag dialog
    locations/         location queries, selector, nearest-district lookup
    map/               map data query, Leaflet components
    moderation/        moderation service/actions, admin components
    prices/            filters, queries, service, comparison, units, freshness, components
  db/                  Drizzle schema, seed logic, seed data (locations, catalog)
  lib/                 db client, auth session, i18n, identity, rate limit, http, utils
  messages/            bn.ts (source of truth), en.ts, long-form page copy
  schemas/             shared Zod schemas (client + server)
  config/              env (server) and site (public) configuration
  proxy.ts             anonymous client cookie + Supabase session refresh
supabase/migrations/   SQL migrations (schema, indexes, RLS)
scripts/db.ts          migrate / seed CLI
tests/                 unit, integration, e2e
```

## Security model (summary)

- **All writes go through the server** (Server Actions and one upload route). Each validates input with Zod, checks ownership or role in code, and applies database-backed rate limits.
- **Guests** are identified by a random httpOnly cookie (`dk_cid`). Only an HMAC of it is stored. It grants edit/delete on that browser's own content during the edit window.
- **Staff** sign in with Supabase Auth. Roles live in `profiles.role` and are re-checked on every admin page and every moderation action.
- **RLS** is enabled on every table. The anon/authenticated roles can only `SELECT` published rows and non-sensitive columns; they have no write grants.
- User text is rendered as text by React (never as HTML). Stickers are fixed identifiers. Image URLs must come from your own Cloudinary cloud.
- Exact coordinates are never stored. Map and GPS points are rounded to about 100 m, and list-only selections use the district centroid.

See [DEPLOYMENT.md](DEPLOYMENT.md) for free-tier deployment, the first-admin setup and known limitations.

## Data sources & licences

- Administrative areas: [nuhil/bangladesh-geocode](https://github.com/nuhil/bangladesh-geocode), MIT, © 2014 Nuhil Mehdy (`src/db/seed-data/bd-locations.json`).
- Map data: © OpenStreetMap contributors (attribution shown on every map).

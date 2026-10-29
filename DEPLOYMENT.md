# Deploying দাম কত? for ৳0/month

This guide deploys the app on free tiers: **GitHub** (code), **Vercel Hobby** (Next.js hosting), **Supabase Free** (Postgres + staff login), optional **Cloudinary Free** (photos), and **OpenStreetMap-compatible tiles** (maps). No paid domain, server, database or API is required.

> **Free tiers change.** Limits below were accurate when this was written but providers revise quotas, terms and pricing. Check each provider's current pricing page before relying on them. Nothing in this app silently switches to a paid service when a quota runs out — features degrade instead (see [Fallbacks](#fallback-behaviour)).

| Service | Used for | Required? | Free-tier notes (verify current terms) |
|---|---|---|---|
| GitHub | Source control, Vercel deploys | Yes | Free public or private repos. |
| Vercel Hobby | Hosting the Next.js app | Yes (or another Node host) | **Personal, non-commercial use only.** Monthly caps on bandwidth and function execution. No credit card needed. |
| Supabase Free | Postgres database, staff auth | Yes in production | ~500 MB database, limited egress, **projects pause after about a week of inactivity** (restore from the dashboard). No point-in-time backups. No credit card needed. |
| Cloudinary Free | Optional product photos | No | Monthly credit allowance shared by storage, bandwidth and transformations. |
| OSM tiles | Map backgrounds | No (map degrades) | `tile.openstreetmap.org` is donated infrastructure for **light use only** under its [tile usage policy](https://operations.osmfoundation.org/policies/tiles/). Switch providers if traffic grows. |
| Nominatim | Optional locality suggestions | No | Max 1 request/second, identifying User-Agent required ([policy](https://operations.osmfoundation.org/policies/nominatim/)). Off by default. |

Your site will live on a **free provider subdomain** such as `https://damkoto.vercel.app`. A custom domain (e.g. `damkoto.com.bd`) must be **bought separately** from a registrar and is optional. Vercel lets you attach one later at no extra Vercel cost.

---

## 1. Create the GitHub repository

```bash
cd damkoto
git init && git add . && git commit -m "Initial commit"
gh repo create damkoto --private --source=. --push   # or create it on github.com and push
```

`.env*` files are git-ignored. Never commit secrets.

## 2. Create the Supabase project

1. Sign up at [supabase.com](https://supabase.com) → **New project**. Choose a region close to Bangladesh (e.g. Singapore) and generate a strong database password.
2. Open **Project Settings → Database → Connection string**. You need two strings:
   - **Transaction pooler** (port **6543**) for the deployed app (`DATABASE_URL` on Vercel). The app already disables prepared statements, which the transaction pooler requires.
   - **Session pooler** (port 5432) or direct connection for running migrations from your computer. The direct connection may need IPv6; the poolers work over IPv4.
3. Open **Project Settings → API** and copy the **Project URL** and the **anon public key**. You do **not** need the service-role key: the app never uses it.

## 3. Run the database migrations

From your computer, using the session/direct connection string:

```bash
DATABASE_URL="postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres" npm run db:migrate
```

This applies `supabase/migrations/`:

- `0000_init.sql`: tables, foreign keys, indexes (including `pg_trgm` trigram indexes for fuzzy Bengali/English search).
- `0001_security.sql`: enables **Row Level Security** on every table and, on Supabase, revokes all access from `anon`/`authenticated` except `SELECT` on published reports, comments and reference data (sensitive columns excluded).

Applied migrations are tracked in the `drizzle.__drizzle_migrations` table, so re-running is safe. Supabase's security advisor may warn that `pg_trgm` lives in the `public` schema. That is harmless here, and you can move it to `extensions` if you prefer.

## 4. Seed categories, products and locations

```bash
DATABASE_URL="…same connection…" npm run db:seed
```

This inserts categories and subcategories, the product catalog (with Bengali/English aliases) and all 8 divisions, 64 districts and 494 upazilas. It is idempotent and never inserts price reports. **Do not run `db:seed:demo` against production**; it refuses unless you set `ALLOW_DEMO_SEED=true` explicitly.

## 5. Configure authentication (staff only)

Browsing and submitting prices need no account. Supabase Auth is only for moderators and admins.

1. **Authentication → Sign In / Providers → Email**: keep it enabled. **Turn off "Allow new users to sign up"**, because staff accounts are created by you.
2. **Authentication → URL Configuration**: set **Site URL** to `https://<your-app>.vercel.app` and add the redirect URL `https://<your-app>.vercel.app/auth/callback` (and `http://localhost:3000/auth/callback` for local testing).
3. Supabase's built-in email sender has a very low hourly limit, which is fine for a few staff using magic links. Password login doesn't send email. For more volume, configure custom SMTP under **Authentication → Emails**.

If you skip this step, the site works fully for the public, and `/login` explains that staff login isn't configured.

## 6. (Optional) Create a Cloudinary account

1. Sign up at [cloudinary.com](https://cloudinary.com) (free plan).
2. From the dashboard copy **Cloud name**, **API key** and **API secret**.
3. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (and optionally `CLOUDINARY_FOLDER`).

Uploads go through `/api/uploads`. The server checks the real file type (JPEG/PNG/WebP magic bytes), size (≤ 4 MB) and dimensions (200–8000 px), then signs the Cloudinary upload itself. The secret never reaches the browser. Submissions only accept image URLs from **your** cloud.

## 7. Configure the map provider

The default is OpenStreetMap's standard tiles with the required attribution. To change provider, set:

```
NEXT_PUBLIC_MAP_TILE_URL=https://{s}.tile.example.org/{z}/{x}/{y}.png
NEXT_PUBLIC_MAP_ATTRIBUTION=© OpenStreetMap contributors, © Example
NEXT_PUBLIC_MAP_MAX_ZOOM=19
```

No code changes are needed. Keep the attribution accurate for whatever provider you choose. Some providers with free tiers require an API key in the URL; because the key is public, use one restricted to your domain. Never bulk-download or pre-seed tiles.

Locations never depend on an external geocoder: clicking the map resolves the **nearest district offline** from district centroids. To also suggest a locality name, set `GEOCODER_PROVIDER=nominatim` and `GEOCODER_USER_AGENT="DamKoto/1.0 (contact: you@example.com)"`. Results are cached in the database per ~1 km cell.

## 8. Environment variables

Every variable is documented in [`.env.example`](.env.example). For production:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Supabase **transaction pooler** string (port 6543) |
| `SESSION_SECRET` | `openssl rand -hex 32` (required; keys cookie/IP hashes) |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-app>.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From step 2 (optional) |
| `CLOUDINARY_*` | From step 6 (optional) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Your real contact address (otherwise a "not configured" note shows) |
| `MODERATION_MODE` | `post` (default) or `pre` |

Leave `DEV_AUTH_ENABLED` and `SHOW_DEMO_DATA` unset in production. Dev login is ignored in production builds regardless.

## 9. Deploy to Vercel

1. Sign in at [vercel.com](https://vercel.com) with GitHub → **Add New → Project** → import the repository. The framework is detected automatically as Next.js.
2. Add the environment variables from step 8 (Production and Preview).
3. **Deploy.** Each push to `main` redeploys automatically, and pull requests get preview URLs.

Other Node hosts work too (`npm run build && npm start`), as long as they set the same variables. Embedded PGlite is disabled in production builds because serverless filesystems are ephemeral.

## 10. Connect the database securely

- Use the pooled connection string only in server-side environment variables. It never appears in `NEXT_PUBLIC_*`.
- The app connects as the database owner and enforces permissions in code. RLS blocks the public Data API from writing anything or reading unpublished/sensitive data.
- Optionally restrict network access under **Project Settings → Database → Network restrictions**. Vercel's egress IPs aren't fixed on Hobby, so leave it open unless your host has static IPs.
- Rotate the database password if it ever leaks, then update `DATABASE_URL` on Vercel.

## 11. Create the first administrator

1. Supabase → **Authentication → Users → Add user**. Enter an email and password and tick "Auto confirm".
2. Sign in once at `https://<your-app>.vercel.app/login`. This creates your `profiles` row with role `user`.
3. Supabase → **SQL Editor**:

   ```sql
   update profiles set role = 'admin', display_name = 'আপনার নাম'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

4. Reload `/admin`. From **Settings** you can now promote other signed-in users to `moderator` or `admin`. No credentials are hard-coded anywhere.

## 12. Verify the deployment

- [ ] `https://<app>/api/health` returns `{"ok":true,"data":{"database":"up"}}`.
- [ ] The homepage loads in Bengali, and **English** switches the whole UI.
- [ ] `/submit`: submit a price with only a district selected (no name, no photo), and it appears on `/prices` and `/map`.
- [ ] Search "আলু" and "potato" and both find it. Filters change the result count.
- [ ] Add a comment with a sticker, then flag the report.
- [ ] `/admin` redirects to `/login` when signed out, then shows the flag after admin login. Resolve it.
- [ ] `/sitemap.xml` lists only published reports, and `/robots.txt` disallows `/admin`.
- [ ] If Cloudinary is configured, a photo upload works. If not, the form says uploads are off.
- [ ] Delete your test report from **My contributions** (within 48 hours) or hide it in `/admin`.

## 13. Monitor free-tier usage

- **Supabase:** **Project → Reports / Usage** for database size, egress and auth users. Watch the 500 MB database cap. The `rate_limits` table cleans itself up, and price reports are small (~1 KB each).
- **Vercel:** **Usage** tab for bandwidth, function invocations and duration.
- **Cloudinary:** dashboard credit meter. Uploads can be switched off at any time by removing the `CLOUDINARY_*` variables.
- **Tiles:** if the map grows popular, move off `tile.openstreetmap.org` (step 7).
- **Inactivity:** a Supabase Free project with no traffic for about a week is paused. The site then shows a friendly "service temporarily unavailable" message on data pages, and static pages still load. Restore it from the Supabase dashboard.

## 14. If a provider changes its limits

- **Database:** any PostgreSQL 15+ with `pg_trgm` works. Change `DATABASE_URL`, then run `db:migrate` and `db:seed`. Staff auth is Supabase-specific; without it, `/admin` is unavailable but everything public keeps working.
- **Hosting:** the app is a standard Next.js server. Any Node host (Render, Railway, Fly.io, a VPS, etc.) works with the same variables. Check that host's free-tier terms.
- **Images:** remove the Cloudinary variables to disable uploads. Existing image URLs keep working while the files exist.
- **Tiles:** change `NEXT_PUBLIC_MAP_TILE_URL` and the attribution.

## 15. Back up and export data

Supabase Free has no point-in-time recovery, so take your own backups regularly:

```bash
# Full logical backup (schema + data) — run from your computer
pg_dump "$DATABASE_URL_SESSION_POOLER" --no-owner --no-privileges -n public -f damkoto-$(date +%F).sql
# Restore into a new database
psql "$NEW_DATABASE_URL" -f damkoto-YYYY-MM-DD.sql
```

The Supabase CLI (`supabase db dump`) also works. For ad-hoc exports, the Table Editor can download any table as CSV. Store backups somewhere private: they contain moderation history and hashed identifiers.

## 16. Deploy without Cloudinary

Leave `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` empty. The photo field then shows "uploads are not enabled", the upload endpoint returns 503, and reports display an illustrated category placeholder. Everything else is unchanged.

## 17. Run locally

```bash
npm install
cp .env.example .env.local     # add DEV_AUTH_ENABLED=true and SHOW_DEMO_DATA=true for development
npm run db:seed:demo           # optional labelled sample data (PGlite)
npm run dev
```

No accounts are needed locally: PGlite stands in for Postgres, and the dev login stands in for Supabase Auth. To test against a real Supabase database locally, set `DATABASE_URL` in `.env.local`.

Tests:

```bash
npm run check                  # typecheck, lint, unit + integration tests
npx playwright install chromium && npm run test:e2e
```

---

## Fallback behaviour

| Situation | What happens |
|---|---|
| No Cloudinary | Photo upload hidden, placeholder images |
| Geolocation denied/unavailable | Message shown, list and map selection keep working |
| No geocoder / Nominatim down | Offline nearest-district lookup still works |
| Tile server down | Map shows a notice, and lists, filters and comparisons keep working |
| No Supabase Auth | Public site fully works, `/login` explains setup, `/admin` unavailable |
| Database paused/unreachable | Header, footer and static pages render; data pages show a localized "temporarily unavailable" message with retry; `/api/health` returns 503 |
| No analytics | None is included, so nothing to configure |

## Abuse prevention and its limits

- Rate limits are **fixed-window counters in Postgres** (`rate_limits` table): per client cookie and per IP hash, for reports, comments, stickers, flags, uploads and logins. They work across serverless instances without Redis. Trade-offs: each check costs one database write, and a determined attacker rotating IPs and clearing cookies can still submit at the per-IP rate. For stronger protection, add a CAPTCHA (e.g. Cloudflare Turnstile, which has a free tier) or Vercel Firewall rules.
- Duplicate detection rejects the same client re-submitting the same product, price, quantity, unit and district within 24 hours.
- Outlier prices (more than 4× from the 90-day median of at least 5 comparable reports), links, phone numbers and high submission frequency are **flagged** for moderators, never deleted. Abusive language sends a report to pending review and blocks the comment.
- The profanity list (`src/lib/content-checks.ts`) is deliberately small and should be extended by moderators.

## Known limitations

- Staff authentication requires Supabase. There is no public user sign-up, so "contributor" identity is cookie-based per browser, and public profiles are not implemented.
- Guest ownership is tied to one browser's cookie. Clearing cookies loses the ability to edit or delete those contributions after the fact (contact moderators instead).
- Upazila-level points use the district centroid on the map, because the dataset has no upazila coordinates.
- Search uses `ILIKE` + `pg_trgm` + catalog aliases. It handles common Bengali/English spelling variants but is not a full transliteration engine.
- Comparisons only merge reports with the same product key, comparable unit, variant/package text and brand. Differently written variants ("মিনিকেট" vs "miniket") stay separate.
- Upload size is capped at 4 MB to fit serverless request body limits.
- The demo seed creates sample data for development only. Production starts empty, and every section shows an invitation to contribute until real reports arrive.

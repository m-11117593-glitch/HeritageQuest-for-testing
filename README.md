# HeritageQuest 🏛️✨

A gamified heritage-exploration web app. Visitors scan QR codes on museum
artifacts to earn EXP, unlock badges & achievements, complete quests, and
occasionally get offered a **Unique Quest** (accept-only-one-at-a-time, with
EXP rewards or penalties). Includes a full **admin panel** for curating the
artifact collection, categories, and quizzes — all bilingual (BM / EN).

Built with **TanStack Start** (React 19 + Vite) on **Supabase** for auth,
database, storage and server functions, deployed to **Cloudflare Workers**.

---

## ✨ Features

### 🧭 Visitor Experience

- 📷 **QR Scanner** (`qr-scanner` lib + camera) with manual code-entry fallback
- 🗺️ **Interactive Map** — artifact pins connected by SVG routes, per-category
  zones that auto-expand as new categories are added, and a live legend
- 🎯 **Quests** — category quests + a grand quest + **Unique Quests**
  (accept-or-decline, 3× EXP for matching scans, EXP penalties for wrong ones,
  live progress widget on every page)
- 🏅 **Badges** (17 total) with rarity tiers (Common → Legendary)
- 🏆 **Achievements** (21 total) — normal + hard mode challenges
- 🔥 **Hard Mode Quiz** — 9 questions, fluorescent UI, tougher questions, bonus EXP
- 👤 **Profile** — chunky EXP bar, level, discount points, and account settings
- 🏆 **Leaderboard** — weekly seasons with rankings, rewards, and season history
- 👥 **Friends** — search players, send / accept / decline / remove friend requests
- 🎁 **Rewards** — redeem discount points for souvenirs
- 📓 **Journal** — discovery progress, category breakdown, and scan timeline
- 🧭 **Journey** — timeline of scanned artifacts with route numbers and zones
- 🎨 **Artifact detail pages** — images, era, origin, material, description, and quizzes
- 🔊 **Web-Audio SFX** (scan beep, fanfare, error, tap) + mute toggle
- 🌏 **BM / EN** language toggle (full bilingual UI)

### 🔐 Auth & Accounts

- ✉️ Email + password signup with confirmation email
- 🟦 **Sign in with Google** (OAuth) — new users get an onboarding step to pick
  an explorer name and set a password
- 🔑 Password reset flow
- 🗑️ **Self-service account deletion** (cascades all user data)
- 👤 Public profiles with searchable usernames
- 🧪 5 pre-seeded demo accounts for testing

### 🛠️ Admin Panel (`/admin`)

- 🔐 Admin role detection with a dedicated collapsible sidebar + language toggle
- 📊 **Dashboard** — total artifacts, categories, quiz questions, quick actions,
  recent artifacts
- 🏺 **Artifact CRUD** — create (with up to 3 image uploads to Supabase Storage),
  edit, delete; bilingual fields with **auto-translate** (EN → BM)
- 🗂️ **Artifact list** — search, bulk-edit checkboxes, and JSON export
- 🏷️ **Categories** — full CRUD with per-category artifact counts; new categories
  appear automatically on the visitor map & side descriptions
- ❓ **Quiz Manager** — custom CRUD per artifact, plus smart **auto-generated
  quizzes** (9 questions derived from the artifact's own fields) with one-click
  import
- 🪄 Auto-generate artifact IDs from names (kebab-case)

---

## ⚡ Quick Start (5 minutes)

```bash
# 1. Create a Supabase project at https://supabase.com
# 2. Go to SQL Editor and paste the contents of supabase/complete-setup.sql
# 3. Get your Project URL + anon key from Project Settings → API
# 4. Create a .env file with:
#    VITE_SUPABASE_URL=https://your-project.supabase.co
#    VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key

# 5. Install and run
bun install
bun run dev

# 6. Open http://localhost:8080 and sign in with:
#    pengembara1@heritagequest.demo / demo123
```

> 📖 **New to setting this up?** Read the **[Complete Setup Guide](complete-setup.md)**
> — it covers everything from downloading the code to deploying with your own
> Supabase, Cloudflare, GitHub, and optional custom domain.

> 🗄️ **Quick database setup?** Use [`supabase/complete-setup.sql`](supabase/complete-setup.sql)
> — one file, one copy-paste into the Supabase SQL Editor. Sets up all tables,
> RLS policies, seed data, demo accounts, and hard mode features.

---

## 🚀 Run Locally

### Prerequisites

- **Bun** ≥ 1.1 (recommended) or Node.js ≥ 20
- A modern browser with camera permissions for QR scanning
- A Supabase project with the database setup (see Quick Start above)

### Install & Start

```bash
bun install
bun run dev
```

Open <http://localhost:8080>.

### Database Setup

**Quick way:**
1. Go to your Supabase dashboard → **SQL Editor**
2. Open [`supabase/complete-setup.sql`](supabase/complete-setup.sql) — copy and paste the entire file
3. Click **Run**

**Granular way:**
Run each migration file in `supabase/migrations/` in chronological order (by filename).

### Build for Production

```bash
bun run build
bun run start
```

---

## 🔑 Environment

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxx
VITE_SUPABASE_PROJECT_ID=your-project-ref
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxx
SUPABASE_PROJECT_ID=your-project-ref
```

Service-role / secret keys are **never** shipped and are not required to run
the app locally.

---

## 🌍 Deploy to a Free Public URL

Pick one — all are free for hobby use.

### Option A — Lovable (one click, easiest)

1. Open the project in Lovable.
2. Click **Publish** (top-right).
3. You get a public URL like `https://<your-app>.lovable.app` — open it on **any phone / laptop / tablet**.

### Option B — Cloudflare Workers (free, SSR-capable, recommended)

This app uses **TanStack Start SSR** — it needs a server runtime, not just static
files. Deploy as a **Worker**, not as Pages.

**Step 1 — build:**

```bash
bun install
bun run build                       # produces .output/ (Nitro Cloudflare target)
```

**Step 2 — set the Supabase env vars on the Worker (REQUIRED).**

The server side of the app reads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`
from `process.env` at request time. Locally these come from `.env`, but a
deployed Cloudflare Worker does **not** read your local `.env` — you MUST
provide them to the Worker.

Both values are **publishable** (safe to commit / paste) so use plain vars,
not secrets:

```bash
# from repo root — one-shot deploy with vars baked in
bunx wrangler deploy \
  --config .output/server/wrangler.json \
  --var SUPABASE_URL:"https://<your-project-ref>.supabase.co" \
  --var SUPABASE_PUBLISHABLE_KEY:"sb_publishable_xxxxxxxxxxxxxxxxxxxx"
```

> Re-run the same command every time you deploy — `--var` values are only
> attached to that upload. Prefer to set them once? Add a `[vars]` block to
> `.output/server/wrangler.json` before `wrangler deploy`, or run
> `bunx wrangler secret put SUPABASE_URL --config .output/server/wrangler.json`
> (and the same for `SUPABASE_PUBLISHABLE_KEY`) so they persist across deploys.

Wrangler prints your URL: `https://<worker-name>.<your-account>.workers.dev`.
Open **that** URL on any device.

> ⚠️ **Do NOT use `wrangler pages deploy .output/public`.**
> That command uploads only static assets, so SSR routes never run, and the
> per-deploy preview alias it prints (e.g. `https://<hash>.heritagequest.pages.dev`)
> is a **3-level subdomain** that Cloudflare's `*.pages.dev` wildcard cert does
> **not** cover — you'll get `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`. If you
> already deployed to Pages, open the production alias
> `https://heritagequest.pages.dev` (2 levels) — the hash alias will never work
> in a browser regardless.

### Option C — Quick LAN / hotspot share (no deploy, same Wi-Fi)

```bash
bun run dev -- --host 0.0.0.0
# → Network: http://192.168.x.x:8080  (open this on other devices on the same Wi-Fi)
```

To share **outside your Wi-Fi** without deploying, tunnel it:

```bash
bunx cloudflared tunnel --url http://localhost:8080
# → https://xxxx-xxxx.trycloudflare.com   (temporary public URL)
```

> **Note on sign-up email confirmation**
> When a new user signs up, the app shows an on-screen notice telling them
> to **check their inbox (and spam folder)** for a confirmation link before
> signing in. This uses Supabase's built-in email — no extra setup required.

---

## 🧭 Pages

### Visitor (`/`)

| Route          | Purpose                                                         |
| -------------- | --------------------------------------------------------------- |
| `/auth`        | Sign in / Sign up (email + Google), password reset, onboarding   |
| `/scan`        | **Home** — QR scanner + manual code entry                        |
| `/map`         | Interactive artifact map with SVG routes and category zones      |
| `/artifacts/:code` | Landing page for a scanned artifact code                      |
| `/artifact/:id` | Artifact detail page (info + quizzes)                            |
| `/quizzes`     | Quiz history & hard mode toggle                                  |
| `/quests`      | Category quests, grand quest, unique quests                      |
| `/leaderboard` | Weekly rankings with season history                              |
| `/friends`     | Search players, manage friend requests                           |
| `/profile`     | Level, EXP bar, badges, achievements, account settings           |
| `/profile/:userId` | Public profile of another player                              |
| `/achievements`| All badges & achievements (locked previews shown)                |
| `/rewards`     | Redeem discount points for souvenirs                             |
| `/journal`     | Discovery progress + scan timeline                               |
| `/journey`     | Timeline of scanned artifacts with route numbers & zones         |

### Admin (`/admin`)

| Route                    | Purpose                                          |
| ------------------------ | ------------------------------------------------ |
| `/admin`                 | Dashboard with stats and quick actions           |
| `/admin/artifacts`       | Artifact list (search, bulk edit, export)        |
| `/admin/artifacts/new`   | Add artifact (images, bilingual, auto-translate) |
| `/admin/artifacts/:id`   | Edit artifact                                    |
| `/admin/artifacts/:id/quizzes` | Quiz manager per artifact                   |
| `/admin/categories`      | Category list with artifact counts               |
| `/admin/categories/new`  | Create a category                                |
| `/admin/categories/:id`  | Edit / delete a category                         |

---

## 🎲 Unique Quest Rules

- Triggered by scanning specific "trigger" artifacts.
- **Only one Unique Quest may be active at a time.** The offer modal on scan
  lets the user **accept** or **decline**.
- After accept → a **live progress widget appears at the top of every page**.
- Scanning matching-category artifacts grants **3× EXP** and progresses the
  quest.
- Scanning a wrong-category artifact **fails** the quest and deducts EXP
  (penalty shown up-front in the offer).
- Completing awards a bonus badge (often Rare / Epic).

---

## 🧪 Testing Without QR Codes

The scanner page has a manual input — type any artifact id (see
`src/lib/museum.ts` → `PIN_POSITIONS`, e.g. `keris-panjang`) and press **Go**.

### Demo accounts (password: `demo123`)

- `pengembara1@heritagequest.demo`
- `jelajahsetia@heritagequest.demo`
- `warisanku@heritagequest.demo`
- `budayaabadi@heritagequest.demo`
- `sejarahmuda@heritagequest.demo`

---

## 🗂️ Tech Stack

| Layer      | Choice                                              |
| ---------- | --------------------------------------------------- |
| Framework  | TanStack Start v1 (SSR + file-based routing)        |
| Bundler    | Vite 7                                              |
| UI         | React 19 + Tailwind CSS v4 + shadcn/ui              |
| State/Data | TanStack Query                                      |
| Backend    | Supabase (Postgres + Auth + Storage + Server Functions) |
| Auth       | Supabase Auth (email + Google OAuth)                |
| Hosting    | Cloudflare Workers                                  |
| QR         | `qr-scanner`                                        |
| Audio      | Web Audio API (synthesized, no assets)              |

---

## 🐍 `requirements.txt`

The reference logic document was originally in Python. The shipped app is
TypeScript, so the Python side is **optional** — `requirements.txt` is
included for anyone who wants to prototype backend logic or utilities in
Python (e.g. batch-generating QR codes for the 15 artifacts).

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

---

## 📜 License

MIT — do whatever, just don't blame us.

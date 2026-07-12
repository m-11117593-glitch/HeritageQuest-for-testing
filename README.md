# HeritageQuest 🏛️✨

> 📖 **New to setting this up?** Read the **[Complete Setup Guide](complete-setup.md)** — it covers everything from downloading the code to deploying with your own Supabase, Cloudflare, GitHub, and optional custom domain.

## 🌍 Deploy to a Free Public URL (share with other devices)

Pick one — all are free for hobby use.

### Option A — Lovable (one click, easiest)

1. Open the project in Lovable.
2. Click **Publish** (top-right).
3. You get a public URL like `https://<your-app>.lovable.app` — open it on **any phone / laptop / tablet**.

### Option B — Cloudflare Workers (free, SSR-capable, recommended for this app)

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
provide them to the Worker. If you skip this step you'll see
`Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY`
the moment any server function runs (e.g. submitting an artifact code).

Both values are **publishable** (safe to commit / paste) so use plain vars,
not secrets. Copy them from your local `.env`:

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
> When a new user signs up, the app now shows an on-screen notice telling them
> to **check their inbox (and spam folder)** for a confirmation link before
> signing in. This uses Lovable Cloud's built-in email — no extra setup
> required.

---


A gamified heritage-exploration web app. Visitors scan QR codes on artifacts to
earn EXP, unlock badges & achievements, complete quests, and occasionally get
offered a **Unique Quest** (accept-only-one-at-a-time, with EXP rewards or
penalties).

Built with **TanStack Start** (React 19 + Vite 7) on **Lovable Cloud** (Supabase
under the hood) for auth, database and server functions.

---

## ✨ Features

- 📷 **QR Scanner** (`qr-scanner` lib + camera) with manual fallback
- 🗺️ **Map page** — locked / unlocked artifact tiles with progress
- 🎯 **Quests** — 4 category quests + 1 grand quest + Unique Quests
- 🏅 **Badges** with rarity tiers (Common → Legendary)
- 🏆 **Achievements** page (locked + unlocked)
- 👤 **Profile** with chunky EXP bar and level
- 🔔 **Global Unique-Quest widget** — appears on every page after accept, with
  live progress bar
- 🔊 **Web-Audio SFX** (scan beep, fanfare, error, tap) + mute toggle
- 🌏 **BM / EN** language toggle
- 🎨 Cute, minimalistic theme (rounded Fredoka + Nunito, soft palette)

---

## 🚀 Run Locally

### Prerequisites

- **Bun** ≥ 1.1 (recommended) or Node.js ≥ 20
- A modern browser with camera permissions for QR scanning
- Lovable Cloud is already provisioned — the `.env` file ships with the
  publishable (safe) keys.

### Install & Start

```bash
bun install
bun run dev
```

Open <http://localhost:8080>.

### Build for Production

```bash
bun run build
bun run start
```

---

## 🔑 Environment

Everything you need is in `.env` (publishable keys only — safe to commit):

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_PROJECT_ID=...
```

Service-role / secret keys are **never** shipped and are not required to run
the app locally.

---

## 🧭 Pages

| Route         | Purpose                                                     |
| ------------- | ----------------------------------------------------------- |
| `/auth`       | Sign in / Sign up (email + password)                        |
| `/scan`       | **Home** — QR scanner + manual code entry                   |
| `/map`        | Artifact grid with lock states and category progress        |
| `/quests`     | Category quests, grand quest, unique quests                 |
| `/profile`    | Level, EXP bar, achieved badges & achievements              |
| `/achievements` | All badges & achievements (locked previews shown)         |
| `/rewards`    | Redeem discount points for souvenirs                        |

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
`src/lib/museum.ts` → `ARTIFACTS`, e.g. `keris-panjang`) and press **Go**.

---

## 🗂️ Tech Stack

| Layer      | Choice                                              |
| ---------- | --------------------------------------------------- |
| Framework  | TanStack Start v1 (SSR + file-based routing)        |
| Bundler    | Vite 7                                              |
| UI         | React 19 + Tailwind CSS v4                          |
| State/Data | TanStack Query                                      |
| Backend    | Lovable Cloud (Postgres + Auth + Server Functions)  |
| QR         | `qr-scanner`                                        |
| Audio      | Web Audio API (synthesized, no assets)              |

---

## 🐍 `requirements.txt`

The reference logic document you provided was in Python. The shipped app is
TypeScript, so the Python side is **optional** — `requirements.txt` is
included for anyone who wants to prototype backend logic or utilities in
Python (e.g. batch-generating QR codes for the 12 artifacts).

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

---

## 📜 License

MIT — do whatever, just don't blame us.

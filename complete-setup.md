# HeritageQuest — Complete Setup Guide

This guide walks you through setting up **HeritageQuest** from scratch — from downloading the code to deploying it live with your own Supabase database, Cloudflare Workers, and (optionally) a custom domain.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Download the Code](#2-download-the-code)
3. [Set Up Supabase](#3-set-up-supabase)
4. [Set Up Local Environment](#4-set-up-local-environment)
5. [Run Locally](#5-run-locally)
6. [Create a Cloudflare Account & API Token](#6-create-a-cloudflare-account--api-token)
7. [Set Up Git & GitHub](#7-set-up-git--github)
8. [Deploy to Cloudflare Workers](#8-deploy-to-cloudflare-workers)
9. [Auto-Deploy with GitHub Actions](#9-auto-deploy-with-github-actions)
10. [Add a Custom Domain (Optional)](#10-add-a-custom-domain-optional)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

Before starting, make sure you have:

| Tool | Why you need it | Where to get it |
|---|---|---|
| **Bun** | Runs the app locally | [bun.sh](https://bun.sh) — install with `npm install -g bun` or `curl -fsSL https://bun.sh/install \| bash` |
| **Git** | Version control & pushing to GitHub | [git-scm.com](https://git-scm.com/downloads) |
| **A code editor** | Editing files (recommended: VS Code) | [code.visualstudio.com](https://code.visualstudio.com/) |
| **GitHub account** | Hosting the code repo | [github.com/signup](https://github.com/signup) — free |
| **Supabase account** | Database & authentication | [supabase.com](https://supabase.com/) — free tier |
| **Cloudflare account** | Hosting the live website | [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) — free tier |

---

## 2. Download the Code

### Option A: Download as ZIP

1. Go to the GitHub repo: `https://github.com/m-11117593-glitch/HeritageQuest`
2. Click the green **"Code"** button → **"Download ZIP"**
3. Extract the ZIP file to a folder on your computer

### Option B: Clone with Git

```bash
git clone https://github.com/m-11117593-glitch/HeritageQuest.git
cd HeritageQuest
```

---

## 3. Set Up Supabase

Supabase provides your database, authentication, and API.

### 3.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com/) and sign in
2. Click **"New project"**
3. Fill in:
   - **Name**: `HeritageQuest` (or anything you like)
   - **Database Password**: Create a strong password and **save it somewhere safe**
   - **Region**: Choose the closest to your users (e.g. `Southeast Asia` for Malaysia)
4. Click **"Create new project"** and wait ~2 minutes for it to provision

### 3.2 Get Your API Keys

1. In your Supabase project dashboard, go to **Project Settings → API**
2. Copy these two values:

| Value | Looks like | Where it goes |
|---|---|---|
| **Project URL** | `https://xxxxxxxxxxxxxxxxxxxx.supabase.co` | `VITE_SUPABASE_URL` in `.env` |
| **anon public key** | `sb_publishable_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx` | `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env` |

### 3.3 Run the Database Migrations

The SQL files in `supabase/migrations/` set up all the tables, RLS policies, and seed data.

**Using the Supabase Dashboard (easiest):**

1. Go to **SQL Editor** in your Supabase dashboard
2. Open each `.sql` file from the `supabase/migrations/` folder **in order** (they are numbered by date — run them from oldest to newest)
3. Copy the entire SQL content, paste it into the SQL Editor, and click **"Run"**
4. Do this for **all** migration files

**Using the Supabase CLI (advanced):**

```bash
# Login to Supabase CLI
npx supabase login

# Link your local project
npx supabase link --project-ref <your-project-ref>

# Push all migrations
npx supabase db push
```

> ⚠️ If you get "relation already exists" errors, the tables already exist. You only need to run the remaining migrations that haven't been applied. You can also check which migrations have been applied by running `npx supabase migration list`.

### 3.4 (Optional) Enable Email Confirmation

By default, new users need to confirm their email. If you want to disable this for testing:

1. Go to **Authentication → Settings** in Supabase dashboard
2. Under **"Email Auth"**, toggle **"Confirm email"** OFF
3. Click **"Save"**

---

## 4. Set Up Local Environment

### 4.1 Create the `.env` File

Create a file named `.env` in the project root folder with this content:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_anon_key_here
VITE_SUPABASE_PROJECT_ID=your-project-ref
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_anon_key_here
SUPABASE_PROJECT_ID=your-project-ref
```

Replace the values with your own from **Step 3.2**.

### 4.2 Install Dependencies

Open a terminal in the project folder and run:

```bash
bun install
```

---

## 5. Run Locally

Start the development server:

```bash
bun run dev
```

Open **http://localhost:8080** in your browser.

### Test Accounts

If you ran the seed migration (`20260710200000_seed_demo_users.sql`), you can sign in with:

| Email | Password |
|---|---|
| `pengembara1@heritagequest.demo` | `demo123` |
| `pengembara2@heritagequest.demo` | `demo123` |

If you didn't run that migration, you can sign up a new account directly through the app.

---

## 6. Create a Cloudflare Account & API Token

### 6.1 Sign Up

1. Go to [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. Create a free account

### 6.2 Enable workers.dev Subdomain

1. After signing in, go to **Workers & Pages** in the sidebar
2. Click **"Enable workers.dev"** to get a free subdomain (e.g. `your-name.workers.dev`)
3. Your subdomain will be shown — note it down

### 6.3 Create an API Token

1. Go to **My Profile → API Tokens** (or [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens))
2. Click **"Create Token"**
3. Find the **"Edit Cloudflare Workers"** template and click **"Use template"**
4. Scroll down and click **"Continue to summary"** → **"Create Token"**
5. **Copy the token immediately** — it looks like `cfut_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
6. Save it somewhere safe (you'll need it for deployment)

---

## 7. Set Up Git & GitHub

### 7.1 Initialize Git

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
```

### 7.2 Create a GitHub Repo

1. Go to [github.com/new](https://github.com/new)
2. Name your repo (e.g. `HeritageQuest`)
3. Click **"Create repository"**
4. Do **NOT** check "Add a README" or ".gitignore" since we already have them

### 7.3 Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/HeritageQuest.git
git push -u origin main
```

> 🔒 **Note**: The `.env` file is in `.gitignore`, so your secrets will NOT be pushed to GitHub. The `wrangler.toml` file contains the publishable Supabase keys that are safe to commit.

---

## 8. Deploy to Cloudflare Workers

### 8.1 Build the App

```bash
bun run build
```

This creates a `.output/` folder with the production build.

### 8.2 Deploy Using Wrangler

```bash
export CLOUDFLARE_API_TOKEN=cfut_your_token_here
bunx wrangler deploy
```

You'll see output like:

```
Uploaded maxajie-zxcvb (XX files)
Deployed maxajie-zxcvb triggers
  https://your-worker.your-subdomain.workers.dev
```

**Your site is now live!** Open the URL in your browser.

---

## 9. Auto-Deploy with GitHub Actions

Every time you push code to GitHub, the site can auto-deploy.

### 9.1 Add Your API Token to GitHub Secrets

1. Go to your GitHub repo: `https://github.com/YOUR_USERNAME/HeritageQuest`
2. Click **Settings → Secrets and variables → Actions**
3. Click **"New repository secret"**
4. **Name**: `CLOUDFLARE_API_TOKEN`
5. **Value**: Paste your Cloudflare API token (`cfut_xxxxxxxxxxxx...`)
6. Click **"Add secret"**

### 9.2 The GitHub Actions Workflow

The project already includes a workflow file at `.github/workflows/deploy.yml`. It runs automatically on every push to the `main` branch:

1. Checks out your code
2. Installs dependencies with Bun
3. Builds the app
4. Deploys to Cloudflare Workers using your API token

### 9.3 Trigger a Deploy

Make a change, commit, and push:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Watch the deployment at **https://github.com/YOUR_USERNAME/HeritageQuest/actions**.

---

## 10. Add a Custom Domain (Optional)

To use your own domain (e.g. `heritagequest.my`) instead of the `*.workers.dev` URL:

### 10.1 Add Domain to Cloudflare

1. Go to **Cloudflare Dashboard → Workers & Pages**
2. Click on your worker (`maxajie-zxcvb`)
3. Go to **Triggers** → **Custom Domains**
4. Click **"Add custom domain"**
5. Enter your domain (e.g. `heritagequest.my`)
6. Follow the prompts to set up DNS

### 10.2 Point Your Domain to Cloudflare

You'll need to change your domain's nameservers to Cloudflare's:

1. Go to your domain registrar (the company you bought the domain from)
2. Find the **Nameservers** settings
3. Replace them with Cloudflare's nameservers (shown in the Cloudflare setup wizard)
4. Wait up to 24 hours for DNS to propagate

### 10.3 Update wrangler.toml (Optional)

You can add your custom domain to `wrangler.toml` so `wrangler deploy` automatically includes it:

```toml
routes = [
  { pattern = "heritagequest.my", custom_domain = true },
]
```

---

## 11. Troubleshooting

### "Missing Supabase environment variable(s)"

The server-side code reads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` from the Worker environment. These are already in `wrangler.toml` under `[vars]`. If you see this error:

1. Make sure `wrangler.toml` has the `[vars]` section with your Supabase values
2. Re-deploy with `bunx wrangler deploy`

### "Failed to automatically retrieve account IDs"

Your Cloudflare API token might not have the right permissions. Create a new token using the **"Edit Cloudflare Workers"** template.

### "You need to register a workers.dev subdomain"

You haven't enabled your workers.dev subdomain yet. Go to **Cloudflare Dashboard → Workers & Pages** and click **"Enable workers.dev"**.

### Git push rejected due to .env

The `.env` file is already in `.gitignore`. If you accidentally committed it, remove it from tracking:

```bash
git rm --cached .env
git commit -m "Remove .env from tracking"
git push
```

### GitHub Actions fails at deploy step

1. Check that you added `CLOUDFLARE_API_TOKEN` as a GitHub secret (not as a variable)
2. Make sure the token starts with `cfut_` and hasn't expired
3. Check the Actions log for the exact error message

### App works locally but not on the live site

1. Check that the live site responds: `curl https://your-url.workers.dev`
2. Re-deploy manually: `export CLOUDFLARE_API_TOKEN=... && bun run build && bunx wrangler deploy`
3. Check the browser console for errors

---

> **Still stuck?** Open an issue on the GitHub repo or contact the project maintainer.

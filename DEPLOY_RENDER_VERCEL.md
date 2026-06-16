# Deploy Cine254 — Render (API) + Vercel (Frontend)

## Architecture

```
Users → Vercel (frontend)  →  Render (Node.js API)  →  MongoDB Atlas
         moviesoko.vercel.app     moviesoko-api.onrender.com
```

You can also use **Render only** (serves frontend + API together) — skip Vercel if you prefer one URL.

---

## STEP 1 — MongoDB Atlas (required for cloud)

1. [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) → free M0 cluster
2. Region: **Frankfurt** or **Cape Town** (closest to Kenya)
3. Database Access → create user
4. Network Access → **Allow from anywhere** (`0.0.0.0/0`)
5. Connect → copy connection string:
   ```
   mongodb+srv://USER:PASS@cluster.mongodb.net/cine254
   ```

---

## STEP 2 — Push to GitHub

```powershell
cd "C:\MY WORK\MOVIE WEBSITE"
git init
git add .
git commit -m "Cine254 ready for deploy"
```

Create a repo on GitHub, then:

```powershell
git remote add origin https://github.com/Samuel-soita/MovieSoko.git
git branch -M main
git push -u origin main
```

> `.env` is git-ignored — never push secrets.

---

## STEP 3 — Deploy API on Render

1. Go to [render.com](https://render.com) → sign up → **New +** → **Blueprint**
2. Connect your GitHub repo
3. Render reads `render.yaml` automatically
4. Add these **Environment Variables** in the dashboard:

| Variable | Value |
|----------|--------|
| `MONGODB_URI` | Your Atlas connection string |
| `TMDB_API_KEY` | Your TMDB key |
| `OMDB_API_KEY` | Your OMDb key |
| `RAPIDAPI_KEY` | Your RapidAPI key |
| `MPESA_CONSUMER_KEY` | Your Daraja key |
| `MPESA_CONSUMER_SECRET` | Your Daraja secret |
| `MPESA_PASSKEY` | Sandbox passkey |
| `MPESA_CALLBACK_URL` | `https://moviesoko-api.onrender.com/api/payments/callback` |
| `MPESA_SANDBOX_CALLBACK_URL` | Your webhook.site URL |
| `APP_URL` | `https://moviesoko-api.onrender.com` |
| `FRONTEND_URL` | `https://moviesoko.vercel.app` (add after Vercel deploy) |
| `VAPID_PUBLIC_KEY` | From `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Same command |

5. Click **Deploy** — wait ~5 min
6. Your API URL: `https://moviesoko-api.onrender.com`
7. Test: `https://moviesoko-api.onrender.com/api/health`

---

## STEP 4 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → sign up → **Add New Project**
2. Import the same GitHub repo
3. Configure:
   - **Framework Preset:** Other
   - **Root Directory:** `.` (project root)
   - **Build Command:** `node scripts/vercel-build.js`
   - **Output Directory:** `frontend`

4. Add **Environment Variable:**

| Name | Value |
|------|--------|
| `RENDER_API_URL` | `https://moviesoko-api.onrender.com` |

> **Important:** Value is **only the URL** — not `RENDER_API_URL=https://...`. Wrong paste breaks the site.

5. Click **Deploy**
6. Your site: `https://moviesoko.vercel.app` (or custom name)

---

## STEP 5 — Connect them

1. Copy your Vercel URL (e.g. `https://moviesoko.vercel.app`)
2. In **Render dashboard** → Environment → set:
   ```
   FRONTEND_URL=https://moviesoko.vercel.app
   ```
3. Redeploy Render service

4. Update M-Pesa callback (when ready):
   ```
   MPESA_CALLBACK_URL=https://moviesoko-api.onrender.com/api/payments/callback
   ```

---

## STEP 6 — Verify

| Check | URL |
|-------|-----|
| API health | `https://moviesoko-api.onrender.com/api/health` |
| Frontend | `https://moviesoko.vercel.app` |
| Movies load | Browse homepage rows |
| Login works | Register an account |
| M-Pesa | Pay with M-Pesa on any movie |

---

## Render-only option (simpler, one URL)

Skip Vercel entirely — Render serves frontend + API together:

1. Deploy on Render as above
2. Visit `https://moviesoko-api.onrender.com` directly
3. No `RENDER_API_URL` needed on Vercel

---

## Custom domain (optional)

**Vercel:** Settings → Domains → add `cine254.com`  
**Render:** Settings → Custom Domains → add `api.cine254.com`

Then update:
```
APP_URL=https://api.cine254.com
FRONTEND_URL=https://cine254.com
RENDER_API_URL=https://api.cine254.com
MPESA_CALLBACK_URL=https://api.cine254.com/api/payments/callback
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Movies don't load on Vercel | Check `RENDER_API_URL` env var |
| MongoDB disconnected | Verify Atlas URI + IP whitelist |
| M-Pesa Invalid CallBackURL | Use HTTPS Render URL, not localhost |
| Render sleeps (free tier) | First visit takes ~30s to wake up |
| CORS errors | Set `FRONTEND_URL` on Render to your Vercel URL |

# Cine254 Deployment Guide (Phase 2)

## 1. MongoDB Atlas (free)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a free M0 cluster
3. Database Access → add user + password
4. Network Access → allow `0.0.0.0/0` (or Render IPs)
5. Connect → copy connection string
6. Set in `.env`:
   ```
   MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/cine254
   ```

## 2. Deploy to Render

1. Push project to GitHub
2. Go to https://render.com → New Web Service
3. Connect repo, or use `render.yaml` in this project
4. Add all env vars from `.env.example`
5. Deploy → get URL like `https://cine254.onrender.com`
6. Set `APP_URL` and `MPESA_CALLBACK_URL` to your Render URL

## 3. Custom domain

1. Render dashboard → Settings → Custom Domains
2. Add `cine254.com` (or your domain)
3. Update DNS CNAME to Render
4. Enable HTTPS (automatic)

## Phase 3 — M-Pesa Daraja

1. Register at https://developer.safaricom.co.ke
2. Create app → get Consumer Key + Secret
3. Sandbox test credentials for STK Push
4. Add to `.env`:
   ```
   MPESA_CONSUMER_KEY=...
   MPESA_CONSUMER_SECRET=...
   MPESA_SHORTCODE=174379
   MPESA_PASSKEY=...
   MPESA_CALLBACK_URL=https://your-app.onrender.com/api/payments/callback
   MPESA_ENV=sandbox
   MPESA_MOVIE_PRICE=50
   ```

## Phase 3 — Push notifications

Run locally:
```bash
npx web-push generate-vapid-keys
```
Add keys to `.env` as `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`

## Phase 4 — Affiliates

Add affiliate IDs to `.env`:
```
AFFILIATE_NETFLIX=your_id
AFFILIATE_SHOWMAX=your_id
```

Streaming links will include affiliate tracking automatically.

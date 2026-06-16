# Cine254 — Full Setup Guide

Follow these steps in order. Your API keys (TMDB, OMDb, RapidAPI) are already configured.

---

## Step 1 — Verify current setup

```powershell
cd "C:\MY WORK\MOVIE WEBSITE"
npm run setup
```

This tests all your API connections.

---

## Step 2 — MongoDB Atlas (required for accounts, payments, uploads)

MongoDB is **not installed locally**. Use free cloud hosting:

### A. Create cluster (5 min)

1. Go to **[mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)**
2. Sign up free → choose **M0 FREE** cluster
3. Provider: **AWS** → Region: closest to Kenya (e.g. `af-south-1` Cape Town)
4. Cluster name: `cine254` → Create

### B. Create database user

1. Left menu → **Database Access** → **Add New Database User**
2. Username: `cine254user`
3. Password: generate a strong password → **save it**
4. Role: **Read and write to any database**
5. Add User

### C. Allow network access

1. Left menu → **Network Access** → **Add IP Address**
2. Click **Allow Access from Anywhere** (`0.0.0.0/0`) for dev
3. Confirm

### D. Get connection string

1. Left menu → **Database** → **Connect** on your cluster
2. Choose **Drivers** → Node.js
3. Copy the connection string, looks like:
   ```
   mongodb+srv://cine254user:<password>@cine254.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual password
5. Add database name before `?`:
   ```
   mongodb+srv://cine254user:YOURPASS@cine254.xxxxx.mongodb.net/cine254?retryWrites=true&w=majority
   ```

### E. Update `.env`

Open `.env` and set:
```env
MONGODB_URI=mongodb+srv://cine254user:YOURPASS@cine254.xxxxx.mongodb.net/cine254?retryWrites=true&w=majority
```

### F. Restart server

```powershell
npm start
```

Health check should show `"mongodb":"connected"`.

---

## Step 3 — Push notifications (optional, already generated)

VAPID keys are in your `.env`. Users click 🔔 in the navbar to subscribe.

---

## Step 4 — M-Pesa Daraja (sandbox — almost ready)

**Already configured in `.env`:**
- Shortcode: `174379`
- Passkey: ✅ saved
- Test phone: `254708374149`
- Sandbox PIN when prompted: **174379**
- Test charge: **KES 1** (sandbox)

**You only need to add YOUR Consumer Key + Secret:**

1. [developer.safaricom.co.ke](https://developer.safaricom.co.ke) → **My Apps** → your sandbox app
2. Copy **Consumer Key** and **Consumer Secret** into `.env`
3. Restart: `npm start`

**Test:** Open any movie → **Pay with M-Pesa** → phone `254708374149` → PIN **174379**

The app polls payment status automatically (Safaricom can't reach localhost callbacks).

---

## Step 5 — Deploy online (when ready)

See **DEPLOY.md** for Render + custom domain setup.

---

## Quick reference — what's working now

| Feature | Needs MongoDB? | Status |
|---------|---------------|--------|
| Browse movies | No | ✅ Working |
| IMDb / RT scores | No | ✅ Working |
| Where to Watch | No | ✅ Working |
| Kenya Top 10 | No | ✅ Working |
| User accounts | **Yes** | ⏳ After Atlas |
| M-Pesa payments | **Yes** | ⏳ After Atlas + Daraja |
| Creator uploads | **Yes** | ⏳ After Atlas |
| Push alerts | No | ✅ Keys ready |

---

## Need help?

Paste your MongoDB Atlas connection string (hide the password) and say **"connect mongodb"** — I'll add it to `.env` and restart the server for you.

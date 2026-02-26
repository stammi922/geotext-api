# GeoText Dashboard - Jonas's TODO

**Date:** 2026-02-26  
**Estimated Time:** ~15 minutes total

---

## What James Did ✅

1. ✅ Configured 11/14 environment variables in Vercel Production
2. ✅ Created deployment documentation
3. ✅ Created setup scripts
4. ✅ Verified dashboard-phase-1 branch builds successfully
5. ✅ Pushed all docs to repository

---

## What Jonas Needs To Do

### 🔐 Task 1: Create Clerk App (5 min)

1. Go to **https://clerk.com**
2. Sign in with `stammi92@gmail.com`
3. Create application named **"GeoText API"**
4. Enable Email + Google authentication
5. Go to **Paths** settings:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in: `/dashboard`
   - After sign-up: `/dashboard`
6. Copy API keys:
   - `pk_...` (publishable key)
   - `sk_...` (secret key)

### 🗄️ Task 2: Create Vercel Postgres (3 min)

1. Go to **https://vercel.com/crovaxs-projects/geotext-api/stores**
2. Click **Create** → **Postgres**
3. Name: `geotext-db`, Region: `fra1`, Plan: Hobby
4. Click **Create**
5. DATABASE_URL auto-added to env vars ✓

### ⌨️ Task 3: Add Clerk Keys (2 min)

Run in terminal:
```bash
cd ~/GitProjects/geotext-api
./scripts/setup-env.sh
# Enter Clerk keys when prompted
```

### 🚀 Task 4: Deploy Dashboard (3 min)

```bash
cd ~/GitProjects/geotext-api
git checkout main
git merge dashboard-phase-1
git push origin main
```
Vercel auto-deploys on push.

### 🔗 Task 5: Update Stripe Webhook (2 min)

1. Go to **https://dashboard.stripe.com/webhooks**
2. Edit the existing webhook
3. Change endpoint URL to: `https://geotext-api.vercel.app/api/stripe/webhook`
4. Save

---

## Verify It Works

After deployment:

1. ☐ Visit https://geotext-api.vercel.app - page loads
2. ☐ Click Sign Up - Clerk auth works
3. ☐ Log in - redirects to /dashboard
4. ☐ Generate API Key - key appears (geotext_live_...)
5. ☐ Visit /pricing - plans show ($0, $29, $99)
6. ☐ Test API:
   ```bash
   curl -X POST https://geotext-api.vercel.app/api/extract-locations \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"text": "Meet at Times Square, NYC"}'
   ```

---

## Credentials to Save

| Service | Key | Where to Get |
|---------|-----|--------------|
| Clerk Publishable | pk_... | clerk.com dashboard |
| Clerk Secret | sk_... | clerk.com dashboard |

(Stripe and Anthropic keys already saved)

---

## If Something Breaks

- **"publishableKey not found"** → Clerk keys missing, run setup-env.sh
- **Database errors** → Vercel Postgres not created
- **Sign-in doesn't redirect** → Check Clerk Paths settings
- **Stripe checkout fails** → Check NEXT_PUBLIC_APP_URL matches domain

---

**Questions?** Ask James! 🎩

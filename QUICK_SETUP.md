# GeoText API Dashboard - Quick Setup

**Last Updated:** 2026-02-26 16:55

## Current Status ✓

| Component | Status | Notes |
|-----------|--------|-------|
| Repository | ✅ Ready | dashboard-phase-1 branch has all code |
| Stripe Integration | ✅ Done | Live keys configured |
| Anthropic API | ✅ Done | Key configured |
| Static Env Vars | ✅ Done | URLs and prefixes configured |
| Clerk Auth | ⏳ **Jonas Action** | ~5 min via clerk.com |
| Vercel Postgres | ⏳ **Jonas Action** | ~3 min via Vercel dashboard |
| Deployment | ⏳ Ready | After Clerk + Postgres setup |

### Environment Variables (11/14 configured)

✅ Configured:
- ANTHROPIC_API_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET  
- STRIPE_STARTER_PRICE_ID
- STRIPE_PRO_PRICE_ID
- NEXT_PUBLIC_CLERK_SIGN_IN_URL
- NEXT_PUBLIC_CLERK_SIGN_UP_URL
- NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
- NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
- NEXT_PUBLIC_APP_URL
- API_KEY_PREFIX

⏳ **Needed from Jonas:**
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (from Clerk)
- CLERK_SECRET_KEY (from Clerk)
- DATABASE_URL (auto-added by Vercel Postgres)

---

## Jonas: 3 Steps to Complete

### Step 1: Create Clerk App (5 min)

1. Go to **https://clerk.com** → Sign in with `stammi92@gmail.com`
2. Create new application:
   - Name: **GeoText API**
   - Authentication: **Email + Google**
3. Copy from the **API Keys** page:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (pk_...)
   - `CLERK_SECRET_KEY` (sk_...)
4. In **Paths** settings, set:
   - Sign-in: `/sign-in`
   - Sign-up: `/sign-up`
   - After sign-in: `/dashboard`
   - After sign-up: `/dashboard`

### Step 2: Create Vercel Postgres (3 min)

1. Go to **https://vercel.com/crovaxs-projects/geotext-api/stores**
2. Click **Create** → **Postgres** (Neon)
3. Settings:
   - Name: `geotext-db`
   - Region: `fra1` (Frankfurt)
   - Plan: Hobby (free)
4. Click **Create** → env vars auto-added

### Step 3: Run Setup Script

```bash
cd ~/GitProjects/geotext-api
./scripts/setup-env.sh
# Enter Clerk keys when prompted
```

Then deploy:
```bash
cd ~/GitProjects/geotext-api
git checkout main
git merge dashboard-phase-1
git push origin main
```

---

## After Deployment

Update Stripe webhook URL:
- Go to: https://dashboard.stripe.com/webhooks
- Change endpoint to: `https://geotext-api.vercel.app/api/stripe/webhook`

## Test Checklist

- [ ] https://geotext-api.vercel.app loads
- [ ] Sign up works
- [ ] Dashboard shows after login
- [ ] API key generates
- [ ] Pricing page shows plans

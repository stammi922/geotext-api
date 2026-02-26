# GeoText API Dashboard - Deployment Guide

**Created:** 2026-02-26
**Status:** Phase 1 Deployment

## Prerequisites

✅ Stripe configured (live keys in Vercel Production)
✅ ANTHROPIC_API_KEY configured
✅ Repository linked to Vercel

## Required Steps

### Step 1: Create Clerk Application (~5 min)

1. Go to https://clerk.com and sign in with stammi92@gmail.com
2. Click "Create Application"
3. Settings:
   - **Name:** GeoText API
   - **Sign-in options:** Email + Google (recommended)
4. After creation, go to **API Keys** page
5. Copy:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_test_` or `pk_live_`)
   - `CLERK_SECRET_KEY` (starts with `sk_test_` or `sk_live_`)

**Configure redirect URLs:**
- Go to **Paths** → set these URLs:
  - Sign-in URL: `/sign-in`
  - Sign-up URL: `/sign-up`
  - After sign-in URL: `/dashboard`
  - After sign-up URL: `/dashboard`

### Step 2: Create Vercel Postgres Database (~3 min)

1. Go to https://vercel.com/dashboard
2. Select **geotext-api** project
3. Go to **Storage** tab
4. Click **Create Database** → **Postgres**
5. Settings:
   - **Name:** geotext-db
   - **Region:** fra1 (Frankfurt) - closest to users
   - **Plan:** Hobby (free)
6. Click **Create**
7. The DATABASE_URL will auto-populate as env var (verify this in step 3)

### Step 3: Configure Environment Variables

Run this in terminal (or add manually in Vercel dashboard):

```bash
cd ~/GitProjects/geotext-api

# Clerk Auth (replace with your actual keys from Step 1)
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production
# Enter: pk_live_XXXX (or pk_test_XXXX for testing)

vercel env add CLERK_SECRET_KEY production
# Enter: sk_live_XXXX (or sk_test_XXXX for testing)

# Clerk URLs
vercel env add NEXT_PUBLIC_CLERK_SIGN_IN_URL production
# Enter: /sign-in

vercel env add NEXT_PUBLIC_CLERK_SIGN_UP_URL production
# Enter: /sign-up

vercel env add NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL production
# Enter: /dashboard

vercel env add NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL production
# Enter: /dashboard

# App Config
vercel env add NEXT_PUBLIC_APP_URL production
# Enter: https://geotext-api.vercel.app

vercel env add API_KEY_PREFIX production
# Enter: geotext_live_
```

### Step 4: Verify All Environment Variables

Check that ALL these are configured:

```bash
vercel env ls --scope crovaxs-projects --token $(cat ~/.config/vercel/token)
```

Required variables:
- [x] ANTHROPIC_API_KEY
- [x] STRIPE_SECRET_KEY
- [x] STRIPE_WEBHOOK_SECRET
- [x] STRIPE_STARTER_PRICE_ID
- [x] STRIPE_PRO_PRICE_ID
- [ ] NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- [ ] CLERK_SECRET_KEY
- [ ] NEXT_PUBLIC_CLERK_SIGN_IN_URL
- [ ] NEXT_PUBLIC_CLERK_SIGN_UP_URL
- [ ] NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL
- [ ] NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL
- [ ] DATABASE_URL (auto-set by Vercel Postgres)
- [ ] NEXT_PUBLIC_APP_URL
- [ ] API_KEY_PREFIX

### Step 5: Deploy Dashboard Branch

Option A - Deploy dashboard-phase-1 as preview (safer):
```bash
cd ~/GitProjects/geotext-api
git checkout dashboard-phase-1
vercel --prod --scope crovaxs-projects --token $(cat ~/.config/vercel/token)
```

Option B - Merge to main and deploy (recommended for production):
```bash
cd ~/GitProjects/geotext-api
git checkout main
git merge dashboard-phase-1
git push origin main
# Vercel auto-deploys on push to main
```

### Step 6: Initialize Database

The database schema will be auto-created on first use, but you can trigger it manually:

```bash
# Visit the dashboard after deployment
curl -I https://geotext-api.vercel.app/dashboard
```

Or check Vercel logs for: "✅ Database schema initialized"

### Step 7: Configure Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click on the existing webhook (or add new endpoint)
3. Update **Endpoint URL** to: `https://geotext-api.vercel.app/api/stripe/webhook`
4. Ensure these events are enabled:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `charge.failed`

---

## Verification Checklist

After deployment, test each feature:

### 1. Landing Page
- [ ] Visit https://geotext-api.vercel.app
- [ ] Page loads without errors

### 2. Sign Up Flow
- [ ] Click "Get Started" or navigate to /sign-up
- [ ] Create account with email or Google
- [ ] Redirects to /dashboard after sign-up

### 3. Dashboard
- [ ] Dashboard shows user info
- [ ] "Generate API Key" button visible
- [ ] Usage stats display (may be 0)

### 4. API Key Generation
- [ ] Click "Generate API Key"
- [ ] Key displays (starts with `geotext_live_`)
- [ ] Key appears in list after refresh

### 5. Billing/Pricing
- [ ] Navigate to /pricing
- [ ] Plans display (Free, Starter $29, Pro $99)
- [ ] Click "Upgrade" on Starter or Pro
- [ ] Stripe checkout opens
- [ ] (Optional) Complete test purchase

### 6. API Endpoint
- [ ] Test extraction with generated key:
```bash
curl -X POST https://geotext-api.vercel.app/api/extract-locations \
  -H "Authorization: Bearer geotext_live_XXXXX" \
  -H "Content-Type: application/json" \
  -d '{"text": "Meet me at Times Square, New York"}'
```

---

## Credentials to Save

After setup, save these credentials:

| Service | Credential | Location |
|---------|------------|----------|
| Clerk | Publishable Key | Vercel env |
| Clerk | Secret Key | Vercel env |
| Vercel Postgres | DATABASE_URL | Auto-configured |
| Stripe | All keys | Already configured |

---

## Troubleshooting

### "Clerk: publishableKey not found"
→ Check NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set in Vercel

### "Database connection error"
→ Verify DATABASE_URL is set (created with Vercel Postgres)

### "Stripe checkout not opening"
→ Check NEXT_PUBLIC_APP_URL is correct

### "Webhook signature failed"
→ Update webhook URL in Stripe dashboard to match production URL

---

## Cost Summary (Monthly)

| Service | Plan | Cost |
|---------|------|------|
| Clerk | Free | $0 (up to 10k MAU) |
| Vercel Postgres | Hobby | $0 |
| Vercel Hosting | Hobby | $0 |
| Stripe | Pay as you go | 2.9% + $0.30 per transaction |

**Total fixed cost:** $0/month

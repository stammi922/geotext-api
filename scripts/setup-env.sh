#!/bin/bash
# GeoText API - Add Clerk Keys
# Most env vars are already configured. This just adds Clerk keys.

set -e

VERCEL_TOKEN=$(cat ~/.config/vercel/token)
SCOPE="crovaxs-projects"

echo "🔧 GeoText API - Add Clerk Keys"
echo "================================"
echo ""
echo "Most environment variables are already configured!"
echo "This script only adds the Clerk keys you got from clerk.com"
echo ""

# Prompt for Clerk keys
echo "Enter your Clerk credentials (from clerk.com/dashboard → API Keys):"
echo ""
read -p "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (pk_...): " CLERK_PK
read -p "CLERK_SECRET_KEY (sk_...): " CLERK_SK

if [[ -z "$CLERK_PK" || -z "$CLERK_SK" ]]; then
    echo "❌ Clerk keys are required"
    exit 1
fi

echo ""
echo "Adding Clerk keys to Vercel Production..."

# Add Clerk keys
echo "$CLERK_PK" | vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production --scope $SCOPE --token $VERCEL_TOKEN 2>/dev/null && echo "✓ Added NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" || echo "⚠ May already exist"
echo "$CLERK_SK" | vercel env add CLERK_SECRET_KEY production --scope $SCOPE --token $VERCEL_TOKEN 2>/dev/null && echo "✓ Added CLERK_SECRET_KEY" || echo "⚠ May already exist"

echo ""
echo "✅ Clerk keys added!"
echo ""
echo "📋 All environment variables:"
vercel env ls --scope $SCOPE --token $VERCEL_TOKEN

echo ""
echo "⚠️  Next steps:"
echo "1. Create Vercel Postgres (if not done): https://vercel.com/crovaxs-projects/geotext-api/stores"
echo "2. Merge and deploy:"
echo "   cd ~/GitProjects/geotext-api"
echo "   git checkout main && git merge dashboard-phase-1 && git push origin main"
echo "3. Update Stripe webhook: https://dashboard.stripe.com/webhooks"
echo "   → Set endpoint to: https://geotext-api.vercel.app/api/stripe/webhook"

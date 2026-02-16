# GeoText API - Developer Dashboard & Licensing Plan

## 🎯 Goal
Transform GeoText API from free tool → monetizable SaaS product with:
- User authentication
- API key management
- Usage tracking & rate limiting
- Billing integration
- Developer-friendly dashboard

---

## 🏗️ Architecture Overview

```
User
  ↓
Dashboard (Next.js App) ← Auth (NextAuth.js / Clerk)
  ↓
Vercel Postgres (users, api_keys, usage)
  ↓
API Routes (/api/extract)
  ↓
Upstash Redis (rate limiting + caching)
  ↓
Stripe (billing + subscriptions)
```

---

## 📦 Tech Stack

| Component | Technology | Why |
|-----------|------------|-----|
| **Auth** | Clerk | Email/password + OAuth, beautiful UI, free tier |
| **Database** | Vercel Postgres | Serverless, auto-scaling, built-in connection pooling |
| **Rate Limiting** | Upstash Redis | Edge-compatible, usage-based pricing, <1ms latency |
| **Billing** | Stripe | Industry standard, Stripe Checkout, webhooks |
| **UI** | Tailwind + shadcn/ui | Consistent with landing page, copy-paste components |

---

## 🗄️ Database Schema

### `users` table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  plan TEXT DEFAULT 'free', -- 'free', 'starter', 'pro', 'enterprise'
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### `api_keys` table
```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL, -- bcrypt hash of API key
  key_prefix TEXT NOT NULL, -- First 8 chars (geotext_abc123...)
  name TEXT, -- User-defined name ("Production", "Dev", etc.)
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  revoked_at TIMESTAMP,
  expires_at TIMESTAMP
);
```

### `usage` table
```sql
CREATE TABLE usage (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL, -- '/api/extract'
  status_code INT NOT NULL, -- 200, 400, 500, etc.
  response_time_ms INT, -- Performance tracking
  locations_extracted INT, -- Number of locations found
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast monthly usage queries
CREATE INDEX idx_usage_user_month ON usage (user_id, DATE_TRUNC('month', created_at));
```

---

## 🔑 API Key Format

```
geotext_live_1a2b3c4d5e6f7g8h9i0j
         ^^^^  ^^^^^^^^^^^^^^^^^^^^
         env   random (32 chars)
```

- Prefix: `geotext_`
- Environment: `test_` or `live_`
- Random: 32-char alphanumeric
- Total length: ~40 characters

**Generation:**
```typescript
import crypto from 'crypto';

function generateApiKey(env: 'test' | 'live'): string {
  const random = crypto.randomBytes(16).toString('hex'); // 32 chars
  return `geotext_${env}_${random}`;
}
```

---

## 💰 Pricing Tiers

| Tier | Price | Requests/Month | Rate Limit | Features |
|------|-------|----------------|------------|----------|
| **Free** | $0 | 100 | 10/min | Basic extraction, community support |
| **Starter** | $29/mo | 10,000 | 100/min | Email support, analytics dashboard |
| **Pro** | $99/mo | 100,000 | 1,000/min | Priority support, custom geocoding |
| **Enterprise** | Custom | Unlimited | Custom | SLA, dedicated support, on-prem option |

**Overage Pricing:**
- $0.005/request (half a cent)
- Example: 15,000 requests on Starter = $29 + (5,000 × $0.005) = $54

---

## 🚦 Rate Limiting Strategy

### Redis Key Structure
```
rate_limit:{api_key}:{window}
Example: rate_limit:geotext_live_abc123:2026-02-16-07
```

### Implementation (Upstash Redis)
```typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

async function checkRateLimit(apiKey: string, limit: number): Promise<boolean> {
  const window = new Date().toISOString().slice(0, 13); // Hour-based window
  const key = `rate_limit:${apiKey}:${window}`;
  
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, 3600); // Expire after 1 hour
  }
  
  return current <= limit;
}
```

### Per-Tier Limits
```typescript
const RATE_LIMITS = {
  free: 10,       // 10 req/min
  starter: 100,   // 100 req/min
  pro: 1000,      // 1,000 req/min
  enterprise: 10000 // 10,000 req/min
};
```

---

## 🎨 Dashboard UI Pages

### 1. `/dashboard` - Overview
- Total requests (current month)
- Remaining quota
- Active API keys
- Recent activity (last 10 requests)
- Quick actions (create key, upgrade plan)

### 2. `/dashboard/keys` - API Key Management
- List all keys (name, prefix, created, last used)
- Create new key (copy to clipboard, show once)
- Revoke key (soft delete)
- Rename key

### 3. `/dashboard/usage` - Analytics
- Charts:
  - Requests over time (daily, weekly, monthly)
  - Status code breakdown (200 vs 400 vs 500)
  - Average response time
  - Locations extracted per request
- Filters: Date range, endpoint, status code

### 4. `/dashboard/billing` - Subscription & Billing
- Current plan
- Usage vs quota (progress bar)
- Upgrade/downgrade buttons
- Billing history (invoices from Stripe)
- Payment method (Stripe Elements)

### 5. `/dashboard/docs` - Quick Reference
- Interactive API explorer (curl, JS, Python examples)
- Response format documentation
- Error codes
- Best practices

---

## 🔒 Middleware for API Key Validation

### `/app/api/extract/route.ts` (Updated)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyApiKey, trackUsage, checkRateLimit } from '@/lib/api';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  // 1. Extract API key from header
  const apiKey = request.headers.get('X-API-Key');
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing API key. Add X-API-Key header.' },
      { status: 401 }
    );
  }

  // 2. Verify API key
  const keyData = await verifyApiKey(apiKey);
  if (!keyData) {
    return NextResponse.json(
      { error: 'Invalid API key' },
      { status: 401 }
    );
  }

  // 3. Check rate limit
  const allowed = await checkRateLimit(keyData.userId, keyData.plan);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Upgrade your plan for higher limits.' },
      { status: 429 }
    );
  }

  // 4. Process request (existing logic)
  try {
    const { text } = await request.json();
    const locations = await extractLocations(text);
    
    // 5. Track usage
    await trackUsage({
      userId: keyData.userId,
      apiKeyId: keyData.keyId,
      endpoint: '/api/extract',
      statusCode: 200,
      responseTimeMs: Date.now() - startTime,
      locationsExtracted: locations.length,
    });

    return NextResponse.json({ locations });
  } catch (error) {
    // Track failed request
    await trackUsage({
      userId: keyData.userId,
      apiKeyId: keyData.keyId,
      endpoint: '/api/extract',
      statusCode: 500,
      responseTimeMs: Date.now() - startTime,
      locationsExtracted: 0,
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 💳 Stripe Integration

### Webhook Handler: `/api/webhooks/stripe`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { updateUserPlan } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle different event types
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      await updateUserPlan(
        session.client_reference_id!, // userId
        session.subscription as string,
        session.customer as string
      );
      break;

    case 'customer.subscription.updated':
      const subscription = event.data.object as Stripe.Subscription;
      await updateUserPlan(
        subscription.metadata.userId,
        subscription.id,
        subscription.customer as string,
        subscription.items.data[0].price.lookup_key // 'starter', 'pro', etc.
      );
      break;

    case 'customer.subscription.deleted':
      const deletedSub = event.data.object as Stripe.Subscription;
      await updateUserPlan(
        deletedSub.metadata.userId,
        null,
        null,
        'free' // Downgrade to free
      );
      break;
  }

  return NextResponse.json({ received: true });
}
```

---

## 🚀 Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [ ] Database schema + migrations
- [ ] Clerk authentication setup
- [ ] API key generation + storage
- [ ] Basic middleware (key validation)

### Phase 2: Rate Limiting & Usage Tracking (Week 2)
- [ ] Upstash Redis integration
- [ ] Rate limiting logic
- [ ] Usage tracking (DB inserts)
- [ ] Analytics queries

### Phase 3: Dashboard UI (Week 3)
- [ ] Overview page
- [ ] API Keys page (CRUD)
- [ ] Usage analytics (charts)
- [ ] Documentation page

### Phase 4: Billing Integration (Week 4)
- [ ] Stripe setup (products + prices)
- [ ] Checkout flow
- [ ] Webhook handler
- [ ] Billing portal

### Phase 5: Polish & Launch (Week 5)
- [ ] Error handling + edge cases
- [ ] Email notifications (quota warnings)
- [ ] API rate limit headers
- [ ] Load testing
- [ ] Launch! 🚀

---

## 📊 Success Metrics

| Metric | Target (Month 1) | Target (Month 6) |
|--------|------------------|------------------|
| **Signups** | 100 | 1,000 |
| **Paid Users** | 5 | 50 |
| **MRR** | $150 | $5,000 |
| **API Requests** | 50,000 | 1,000,000 |
| **Churn Rate** | <10% | <5% |

---

## 🔐 Security Considerations

1. **API Key Storage**: Never store plain-text keys. Use bcrypt to hash.
2. **HTTPS Only**: Enforce HTTPS for all API requests.
3. **Rate Limiting**: Prevent abuse with Redis-based rate limiting.
4. **Input Validation**: Sanitize all user inputs (text, API keys).
5. **CORS**: Restrict API access to allowed origins (configurable per key).
6. **Webhook Verification**: Always verify Stripe webhook signatures.
7. **SQL Injection**: Use parameterized queries (built into Vercel Postgres).

---

## 📝 Next Steps

1. **Review this plan** - Approve architecture & tech stack
2. **Set up infrastructure** - Clerk, Vercel Postgres, Upstash Redis, Stripe accounts
3. **Create database** - Run migrations, seed initial data
4. **Build dashboard** - Start with Phase 1 (auth + keys)
5. **Integrate billing** - Stripe products + webhook handler
6. **Launch beta** - Invite early users, gather feedback
7. **Public launch** - Marketing push, Product Hunt, Twitter

---

## 💰 Estimated Costs (Monthly)

| Service | Free Tier | Paid (100 users) |
|---------|-----------|------------------|
| Vercel Postgres | 0.5 GB | $24/mo |
| Upstash Redis | 10K commands | $10/mo |
| Clerk | 10K MAU | $25/mo |
| Stripe | - | 2.9% + 30¢ per transaction |
| **Total** | **$0** | **~$60/mo + tx fees** |

**Break-even**: 2-3 paid users (@ $29/mo) = profitable! 🎯

---

## 🎉 Why This Will Work

1. **Developer-Friendly**: Clean API, great docs, generous free tier
2. **Transparent Pricing**: No hidden fees, clear upgrade path
3. **Fast Time-to-Value**: Sign up → get API key → make requests in <2 minutes
4. **Built to Scale**: Redis + Postgres + Vercel = handles 1M+ requests/month
5. **Monetization-Ready**: Stripe integration from day 1, ready to sell

---

**Ready to build this?** Let me know which phase to start with! 🚀

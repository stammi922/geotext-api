# GeoText API Setup

## 🚀 Deployed!

**Live URL:** https://geotext-api.vercel.app/

**GitHub:** https://github.com/stammi922/geotext-api

## ⚠️ Required: Add API Key

The API is deployed but needs your Anthropic API key to work:

### Option 1: Via Vercel Dashboard
1. Go to https://vercel.com/crovaxs-projects/geotext-api/settings/environment-variables
2. Add: `ANTHROPIC_API_KEY` = your-api-key
3. Redeploy (or it auto-deploys on next push)

### Option 2: Via CLI
```bash
cd ~/GitProjects/geotext-api
vercel env add ANTHROPIC_API_KEY production
# Paste your API key when prompted
vercel --prod
```

### Option 3: Optional - Google Maps for better accuracy
```bash
vercel env add GOOGLE_MAPS_API_KEY production
```

## ✅ Testing

Once the API key is added, test with:

```bash
curl -X POST https://geotext-api.vercel.app/api/extract-locations \
  -H "Content-Type: application/json" \
  -d '{"text": "Visit the Eiffel Tower in Paris"}'
```

## 📊 Demo

The landing page has an interactive demo at https://geotext-api.vercel.app/

## 🎯 What It Does

- **Input:** Any text blob containing location mentions
- **Output:** Structured array with:
  - Location name
  - Description  
  - Latitude/longitude
  - Confidence level (high/medium/low)
  - Sources used (llm, google, nominatim)

## 💰 Costs

- **Vercel:** Free tier is fine for moderate usage
- **Anthropic:** ~$0.003 per 1K input tokens, ~$0.015 per 1K output tokens
- **Google Maps:** First $200/month free, then ~$5 per 1K requests
- **Nominatim:** Free (but rate limited)

---

Built by James 🎩 on Feb 16, 2026 at 2:00 AM

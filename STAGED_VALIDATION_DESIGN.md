# GeoText API - Staged Validation Design

## 🎯 Goal
Reduce API costs while maintaining accuracy by using a multi-stage validation approach.

---

## 💰 Cost Comparison (per 1M tokens)

| Model | Input | Output | Cost per Request* | vs Haiku |
|-------|-------|--------|-------------------|----------|
| **Gemini 2.0 Flash** | $0.10 | $0.40 | **$0.00006** | **11x cheaper** ✅ |
| **Claude Haiku 4.5** | $1.00 | $5.00 | $0.0007 | Baseline |
| **Claude Sonnet 4.5** | $3.00 | $15.00 | $0.002 | 3x more expensive |

*Typical request: 215 input tokens + 100 output tokens

**Google Maps Geocoding:** $0.005 per request (fixed cost)

---

## 🚦 Staged Validation Strategy

### Stage 1: LLM Extraction (Gemini Flash → Fallback to Haiku)

**Primary:** Gemini 2.0 Flash
- 11x cheaper than Haiku
- Fast (similar latency)
- Good for most locations

**Fallback:** Claude Haiku 4.5
- If Gemini fails (rate limit, timeout, parse error)
- Or if confidence is "low" and re-extraction might help

**Cost savings:** ~90% on LLM costs vs using Haiku for everything

---

### Stage 2: Geocoding Validation (2-Service Sanity Check)

**Process:**
1. Extract locations with LLM (Stage 1)
2. Geocode with **Google Maps** (primary, most accurate)
3. If Google fails → Geocode with **Nominatim** (free, OpenStreetMap)
4. **Sanity check:** If both services return coordinates, compare them:
   - If `distance < 10km` → Accept (coordinates are "close enough")
   - If `distance >= 10km` → Use 3rd service (Mapbox or another) for tiebreaker

**Why this works:**
- Most locations (Paris, Tokyo, Eiffel Tower) will match within 10km
- Ambiguous locations (Springfield, USA) will differ significantly
- Only use expensive 3rd service for edge cases (~5-10% of requests)

---

### Stage 3: Confidence Scoring

**Assign confidence based on agreement:**

| Scenario | Confidence | Action |
|----------|------------|--------|
| Both services agree (<10km apart) | **High** | Accept immediately |
| Google succeeds, Nominatim fails | **Medium** | Accept Google result |
| Both fail or differ >10km | **Low** | Use 3rd service OR return without coordinates |

---

## 📐 Distance Calculation (Haversine Formula)

```typescript
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}
```

---

## 🔄 Full Request Flow

```
User Text
  ↓
[Stage 1: LLM Extraction]
  ↓ Try Gemini Flash (11x cheaper)
  ↓ Fallback: Haiku if Gemini fails
  ↓
Extracted Locations: ["Paris", "Tokyo"]
  ↓
[Stage 2: Geocoding]
  ↓
For each location:
  ↓
  1. Google Maps → lat1, lon1
  2. Nominatim → lat2, lon2
  ↓
  Compare distances:
  ↓
  IF distance < 10km:
    ✅ Accept (confidence: high)
  ↓
  ELSE IF distance >= 10km:
    ⚠️ Use 3rd service (Mapbox)
    → Pick majority vote
    → confidence: medium
  ↓
Return: [
  {
    name: "Paris",
    coordinates: { lat: 48.8566, lon: 2.3522 },
    confidence: "high"
  }
]
```

---

## 💡 Cost Optimization Strategies

### 1. **Prompt Caching (Anthropic)**
- Cache system prompt (static across requests)
- Save 90% on repeated prompt tokens
- Cost: $0.30/1M cached input tokens (vs $1/1M normal)

### 2. **Batch Processing**
- If multiple requests come in simultaneously, batch geocoding
- Google Maps allows batch requests (up to 100 locations)
- Reduces API overhead

### 3. **Redis Caching**
- Cache geocoding results for common locations
- "Paris" → `{lat: 48.8566, lon: 2.3522}` (1 year TTL)
- Avoid re-geocoding famous places

### 4. **Rate Limiting by Confidence**
- Free tier: Only "high" confidence results
- Paid tier: Allow "medium" confidence (more geocoding attempts)

---

## 📊 Cost Breakdown (New Economics)

**Per Request Cost (Gemini + Google + Nominatim sanity check):**
- LLM (Gemini Flash): $0.00006
- Google Maps: $0.005
- Nominatim: Free
- **Total: $0.00506 (~0.5 cents per request)**

**New Pricing Tiers:**

| Tier | Price | Requests | Cost | Profit |
|------|-------|----------|------|--------|
| **Free** | $0 | 100 | $0.51 | -$0.51 ✅ Acceptable loss |
| **Starter** | $29 | 10,000 | $50.60 | **+$21.60 profit!** 🎉 |
| **Pro** | $99 | 100,000 | $506 | **-$407 loss** ❌ |

**Adjusted Pro Tier:**
- $99 for 15,000 requests → Cost: $75.90 → Profit: **+$23.10** ✅
- OR $149 for 25,000 requests → Cost: $126.50 → Profit: **+$22.50** ✅

**OR keep 100K requests but raise price:**
- $550/mo for 100K requests → Cost: $506 → Profit: **+$44** ✅

---

## 🧪 Testing Plan

### Test Cases:
1. **Famous landmarks** (Eiffel Tower, Big Ben) → Should always match <1km
2. **Ambiguous cities** (Paris, TX vs Paris, FR) → May differ >1000km
3. **Addresses** (1600 Pennsylvania Ave) → Should match <100m
4. **International** (München, 東京) → Test geocoding in non-English
5. **Non-existent** (FakeCityName123) → Both services should fail

### Metrics to Track:
- **Agreement rate:** % of requests where Google/Nominatim agree (<10km)
- **3rd service usage:** % of requests needing tiebreaker
- **Average cost per request:** Actual API spend
- **Latency:** Time from request to response

---

## 🚀 Implementation Phases

### Phase 1: Gemini Integration (Week 1)
- [ ] Add Gemini SDK to project
- [ ] Implement extraction with Gemini Flash
- [ ] Add fallback to Haiku
- [ ] Test accuracy vs Haiku baseline

### Phase 2: Dual Geocoding (Week 1)
- [ ] Integrate Nominatim API (free)
- [ ] Implement distance comparison (Haversine)
- [ ] Add confidence scoring logic
- [ ] Test with 100+ diverse locations

### Phase 3: 3rd Service Tiebreaker (Week 2)
- [ ] Add Mapbox as 3rd geocoder (or Opencage)
- [ ] Implement majority vote logic
- [ ] Track 3rd service usage rate
- [ ] Optimize threshold (10km vs 50km vs 100km?)

### Phase 4: Caching & Optimization (Week 2)
- [ ] Redis caching for common locations
- [ ] Prompt caching (Anthropic)
- [ ] Batch geocoding support
- [ ] Load testing

---

## 🎯 Success Criteria

**Cost Goals:**
- Average cost per request: <$0.006 (0.6 cents)
- 95% of requests use only 2 services (no tiebreaker)
- Gemini Flash handles 90%+ of extractions

**Accuracy Goals:**
- 95%+ agreement rate between Google/Nominatim
- <1% of requests return "low" confidence
- Famous landmarks always "high" confidence

**Performance Goals:**
- P50 latency: <500ms
- P95 latency: <1500ms
- 99.9% uptime (no service degradation)

---

## 🔐 Fallback Strategy

**If all geocoding services fail:**
1. Return location name without coordinates
2. Set confidence: "none"
3. Log for manual review
4. User can still see extracted locations (useful even without coords)

**If LLM extraction fails:**
1. Return empty array
2. Return 500 error with retry suggestion
3. Log for debugging

---

## 📝 API Response Format (with Staged Validation)

```json
{
  "locations": [
    {
      "name": "Eiffel Tower",
      "coordinates": {
        "lat": 48.8584,
        "lon": 2.2945
      },
      "confidence": "high",
      "sources": {
        "extraction": "gemini-flash",
        "geocoding": ["google", "nominatim"],
        "agreement": true,
        "distance_km": 0.3
      }
    },
    {
      "name": "Springfield",
      "coordinates": {
        "lat": 39.7817,
        "lon": -89.6501
      },
      "confidence": "medium",
      "sources": {
        "extraction": "gemini-flash",
        "geocoding": ["google", "nominatim", "mapbox"],
        "agreement": false,
        "distance_km": 1247,
        "tiebreaker": "mapbox"
      }
    }
  ],
  "meta": {
    "total_cost": 0.00512,
    "llm_used": "gemini-flash",
    "geocoding_calls": 5,
    "processing_time_ms": 487
  }
}
```

---

## 🎉 Benefits

1. **90% cost reduction** on LLM (Gemini vs Haiku)
2. **Profitable at current pricing** ($29 Starter tier now makes $21 profit!)
3. **Higher accuracy** (2-3 service validation catches errors)
4. **Graceful degradation** (multiple fallbacks prevent total failure)
5. **Transparent to users** (response includes confidence + sources)

---

**Next Steps:**
1. Run accuracy tests (Haiku vs Gemini Flash vs Sonnet)
2. Implement Stage 1 (Gemini + Haiku fallback)
3. Implement Stage 2 (dual geocoding with distance check)
4. Deploy to staging environment
5. A/B test with live traffic

**Estimated Implementation Time:** 2-3 weeks (not 5 weeks for full dashboard)

---

**Ready to build?** This makes GeoText API actually profitable! 🚀

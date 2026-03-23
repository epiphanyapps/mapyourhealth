# Recommended for You (Disabled)

**Status:** Disabled (2026-03-21)

## Overview

The "Recommended for You" feature displays product recommendation cards on the Dashboard screen based on detected hazards (danger/warning contaminant levels) in a user's subscribed location.

## How It Works

1. The `RecommendationsSection` component analyzes the user's zip code data for contaminant stats with `danger` or `warning` status.
2. It maps contaminant categories (fertilizer, pesticide, radioactive, etc.) to stat categories (e.g., water).
3. It looks up hazard categories for those stat categories and fetches matching product recommendations.
4. Up to 3 `ProductRecommendationCard` cards are displayed, each with a product name, description, and "Learn More" link.

## Components

| File | Purpose |
|------|---------|
| `apps/mobile/app/components/RecommendationsSection.tsx` | Container that selects recommendations based on hazard data |
| `apps/mobile/app/components/ProductRecommendationCard.tsx` | Card UI with green theme, heart icon, and external link |
| `apps/mobile/app/data/mock/recommendations.ts` | Mock recommendation data (water filters, air purifiers, emergency kits, etc.) |
| `apps/mobile/app/data/types/safety.ts` | `ProductRecommendation` interface |

## Data

Recommendations are currently sourced from mock data in `apps/mobile/app/data/mock/recommendations.ts`, organized by category:

- **Water** — Home water filters, water test kits
- **Air** — HEPA purifiers, N95 masks, air quality monitors
- **Health** — First aid kits, infection prevention, pulse oximeters
- **Disaster** — Emergency survival kits, weather radios, evacuation bags, flood barriers

Each recommendation is linked to one or more hazard category IDs for matching.

## Why Disabled

The feature was disabled because it relies entirely on mock/placeholder data and product URLs (example.com links). It needs a real data source and proper product vetting before being user-facing.

## Re-enabling

To re-enable, restore the following in `apps/mobile/app/screens/DashboardScreen.tsx`:

```tsx
import { RecommendationsSection } from "@/components/RecommendationsSection"

// Inside the render, after the stats list and before the Report Hazard button:
{zipData && <RecommendationsSection zipData={zipData} />}
```

All component files are still in the codebase and ready to use.

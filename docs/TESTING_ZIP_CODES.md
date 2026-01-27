# Testing ZIP Codes for MapYourHealth

## Available Mock Data

The following ZIP codes have mock measurement data available for testing:

| ZIP Code | Location | State | Jurisdiction | Expected Status | Notes |
|----------|----------|-------|--------------|-----------------|-------|
| **90210** | Beverly Hills | CA | US-CA | Safe | Low contamination levels |
| **10001** | New York | NY | US-NY | Warning | Elevated lead (12 μg/L) |
| **33139** | Miami Beach | FL | US-FL | Safe | Normal levels |
| **60601** | Chicago | IL | US-IL | Danger | High lead (18 μg/L) + coliform |
| **98101** | Seattle | WA | US-WA | Very Safe | Lowest contamination |

## Jurisdiction-Aware Thresholds

The app now uses location-based jurisdiction lookup instead of hardcoded "US" limits.

### Example: Lead Limits by Jurisdiction

| Jurisdiction | Lead Limit (μg/L) | Notes |
|--------------|-------------------|-------|
| WHO | 10 | Global standard |
| US (Federal) | 15 | EPA action level |
| US-NY | 15 | Follows federal |
| US-CA | 15 | Follows federal |
| CA (Canada Federal) | 5 | Stricter than US |
| CA-QC (Quebec) | 5 | Follows Canadian federal |
| EU | 5 | European standard |

### Testing Jurisdiction Detection

1. **US ZIP codes** (5 digits): Detected as US, state extracted from bundled metadata
   - `10001` → NY → US-NY jurisdiction
   - `90210` → CA → US-CA jurisdiction

2. **Canadian postal codes** (A1A 1A1 format): Detected as CA, province from first letter
   - `H2X 1Y6` → QC (H = Quebec) → CA-QC jurisdiction
   - `M5V 3L9` → ON (M = Ontario) → CA-ON jurisdiction
   - `V6B 1A1` → BC (V = British Columbia) → CA-BC jurisdiction

## Canadian Postal Code Prefixes

| First Letter | Province |
|--------------|----------|
| A | Newfoundland and Labrador |
| B | Nova Scotia |
| C | Prince Edward Island |
| E | New Brunswick |
| G, H, J | Quebec |
| K, L, M, N, P | Ontario |
| R | Manitoba |
| S | Saskatchewan |
| T | Alberta |
| V | British Columbia |
| X | Northwest Territories / Nunavut |
| Y | Yukon |

## Seeded Data Summary

The backend database contains:

- **18 jurisdictions**: WHO, EU, US, CA + state/provincial (NY, CA, TX, FL, IL, WA, QC, ON, BC, AB, etc.)
- **174 contaminants**: Parsed from Risks.xlsx
  - 68 pesticides
  - 48 organic compounds (including PFAS)
  - 29 disinfection byproducts
  - 17 radioactive contaminants
  - 10 heavy metals (inorganic)
  - 2 fertilizers
- **414 thresholds**: Jurisdiction-specific limits

## Testing the Fix

### Before (Bug)
All users saw US federal limits regardless of location.

### After (Fixed)
- User in NYC (10001) → sees US-NY thresholds
- User in Montreal (H2X 1Y6) → sees CA-QC thresholds (stricter lead limit!)
- User in Beverly Hills (90210) → sees US-CA thresholds

## Running Seeds

```bash
# Parse Risks.xlsx and regenerate seed-data.json
cd packages/backend
yarn parse:excel

# Clear and reseed the database
yarn seed:clear

# Fetch latest amplify_outputs.json (after deployment)
cd apps/mobile
yarn amplify:outputs
```

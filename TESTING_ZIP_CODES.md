# Testing Guide

## URLs

- **Mobile App**: https://app.mapyourhealth.info/
- **Admin Dashboard**: https://admin.mapyourhealth.info/

---

## Mobile App Testing

### Search by Zip Code

Try these zip codes to see different safety conditions:

| Zip Code | Location | What You'll See |
|----------|----------|-----------------|
| 98101 | Seattle, WA | Mostly safe (green) |
| 10001 | New York, NY | Multiple warnings (yellow) |
| 60601 | Chicago, IL | Danger alert for lead (red) |
| 33139 | Miami Beach, FL | Flood danger |
| 85001 | Phoenix, AZ | Wildfire & ozone danger |
| 90210 | Beverly Hills, CA | Wildfire warning |

### GPS Location Feature

1. Tap the GPS icon (crosshairs) next to the search bar
2. Grant location permission when prompted
3. Your postal code should auto-populate
4. If no data exists for your area, you'll see "No data yet" with option to be notified

### International Users

The app works with postal codes from many countries:

| Country | Example |
|---------|---------|
| USA | `90210` |
| Canada | `M5V 3L9` |
| UK | `SW1A 1AA` |
| Australia | `2000` |
| Germany | `10115` |

- **US users** see "zip code"
- **Canadian users** see "postal code"
- **UK users** see "postcode"

If we don't have data for your area yet, you can sign up to be notified when it becomes available.

---

## Available Test Data

### US Cities with Data (34 zip codes)

**Major Cities (10)**
- 90210 (Beverly Hills), 10001 (NYC), 33139 (Miami Beach)
- 60601 (Chicago), 98101 (Seattle), 30301 (Atlanta)
- 75201 (Dallas), 85001 (Phoenix), 80202 (Denver), 02101 (Boston)

**Queens, NY (12)**
- 11368, 11356, 11101, 11102, 11354, 11372
- 11373, 11375, 11361, 11432, 11385, 11693

**Manhattan, NY (12)**
- 10002, 10003, 10012, 10013, 10016, 10017
- 10023, 10028, 10029, 10027, 10032, 10038

---

## Admin Dashboard Testing

1. **View all zip codes**: Visit `/zip-codes`
2. **View safety metrics**: Visit `/stats`
3. **View specific zip code**: Visit `/zip-codes/10001` (NYC example)

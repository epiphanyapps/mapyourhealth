# Testing Zip Codes

## Production URLs

- **Mobile App**: https://app.mapyourhealth.info/
- **Admin Dashboard**: https://admin.mapyourhealth.info/

## Seeded Zip Codes (34 total)

### Major US Cities (10)

| Zip Code | City | State | Notable Conditions |
|----------|------|-------|-------------------|
| 90210 | Beverly Hills | CA | Wildfire warning |
| 10001 | New York | NY | Air quality & lead warnings |
| 33139 | Miami Beach | FL | Flood danger |
| 60601 | Chicago | IL | Lead danger, bacteria warning |
| 98101 | Seattle | WA | Very safe overall |
| 30301 | Atlanta | GA | Air quality warnings |
| 75201 | Dallas | TX | Ozone & flood warnings |
| 85001 | Phoenix | AZ | Ozone danger, wildfire danger |
| 80202 | Denver | CO | Wildfire danger |
| 02101 | Boston | MA | Lead & flu warnings |

### Queens, NY (12)

| Zip Code | Neighborhood | Notable Conditions |
|----------|--------------|-------------------|
| 11368 | Corona | Dense urban, multiple warnings |
| 11356 | College Point | Flood danger (coastal) |
| 11101 | Long Island City | Industrial area, flood warning |
| 11102 | Astoria | Good transit, moderate air |
| 11354 | Flushing | Busy commercial, air warnings |
| 11372 | Jackson Heights | Dense, health warnings |
| 11373 | Elmhurst | Dense residential |
| 11375 | Forest Hills | Suburban feel, mostly safe |
| 11361 | Bayside | Quiet residential |
| 11432 | Jamaica | Transit hub, multiple warnings |
| 11385 | Ridgewood | Border with Brooklyn |
| 11693 | Rockaway Beach | Flood danger (coastal) |

### Manhattan, NY (12)

| Zip Code | Neighborhood | Notable Conditions |
|----------|--------------|-------------------|
| 10002 | Lower East Side | Older buildings, lead warning |
| 10003 | Greenwich Village | Generally good |
| 10012 | SoHo | Moderate air quality |
| 10013 | Tribeca | Excellent healthcare, flood warning |
| 10016 | Murray Hill | Dense residential |
| 10017 | Midtown East | High traffic, air warnings |
| 10023 | Upper West Side | Family-friendly, safe |
| 10028 | Upper East Side | Affluent, excellent services |
| 10029 | East Harlem | Lead danger, health disparities |
| 10027 | Harlem | Aging infrastructure |
| 10032 | Washington Heights | Diverse community |
| 10038 | Financial District | Modern infrastructure, flood warning |

## Testing Scenarios

### Mobile App (https://app.mapyourhealth.info/)

1. **Safe area**: Search `98101` (Seattle) - should show mostly green/safe
2. **Mixed warnings**: Search `10001` (NYC) - should show multiple yellow warnings
3. **Danger alerts**: Search `60601` (Chicago) - should show red danger for lead
4. **Flood risk**: Search `33139` (Miami Beach) - should show flood danger
5. **Wildfire risk**: Search `85001` (Phoenix) - should show wildfire danger

### GPS Location Feature

1. **Use My Location button**: Tap the GPS icon (crosshairs) next to the search bar
2. **Permission prompt**: Grant location permission when prompted
3. **Auto-populate**: Verify zip code is auto-populated from device location
4. **Loading state**: GPS button shows spinner while fetching location
5. **Permission denied**: Decline permission - should show alert explaining how to enable
6. **Location unavailable**: Test with location services disabled - should show error message

### Admin Dashboard (https://admin.mapyourhealth.info/)

1. **Zip Codes page**: `/zip-codes` - should list all 34 zip codes
2. **Stats page**: `/stats` - should show 11 stat definitions
3. **Zip Code detail**: `/zip-codes/10001` - should show all stats for NYC

## Stat Definitions (11 total)

### Water (3)
- `water-lead` - Lead Levels (ppb)
- `water-nitrate` - Nitrate Levels (mg/L)
- `water-bacteria` - Bacteria Count (CFU/100mL)

### Air (3)
- `air-aqi` - Air Quality Index
- `air-pm25` - PM2.5 Levels (µg/m³)
- `air-ozone` - Ozone Levels (ppb)

### Health (3)
- `health-covid` - COVID-19 Cases (per 100k)
- `health-flu` - Flu Cases (per 100k)
- `health-access` - Healthcare Access (%)

### Disaster (2)
- `disaster-wildfire` - Wildfire Risk (level 1-10)
- `disaster-flood` - Flood Risk (level 1-10)

## Running the Seed Script

From repository root:

```bash
ADMIN_EMAIL=your-admin@email.com ADMIN_PASSWORD=your-password yarn seed:data
```

The seed script is idempotent - it skips existing records and only creates missing ones.

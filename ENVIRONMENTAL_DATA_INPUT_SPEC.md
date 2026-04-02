# Map-Based Environmental Data Input Feature - Issue #178 Enhancement

## Overview
This specification details the design and implementation for a map-based environmental data input system for the MapYourHealth admin portal, enabling environmental scientists like Rayane to input pollution sources and contamination zones through an intuitive geographic interface.

## Feature Requirements

### Core Functionality
- **Interactive Map Interface**: Click-to-place pollution sources with coordinate capture
- **Radius/Zone Definition**: Drag handles or input fields to define contamination impact areas
- **Environmental Data Forms**: Structured input for contaminant types, pollution sources, and metadata
- **Visual Impact Representation**: Color-coded circles/polygons showing contamination zones
- **Geographic Data Persistence**: Save pollution sources with precise coordinates and impact radiuses

### User Workflow (Environmental Scientist - Rayane)
1. **Map Navigation**: Pan/zoom to locate area of interest
2. **Source Placement**: Click map to place pollution source marker
3. **Impact Zone Definition**: Drag radius handle or input distance to define contamination area
4. **Data Entry**: Fill form with pollution details (contaminant types, concentration levels, etc.)
5. **Visualization Review**: See visual representation with appropriate color coding based on severity
6. **Save & Validate**: Persist data with form validation and confirmation

## Database Schema Enhancement

### New Tables

#### PollutionSource
```typescript
PollutionSource: a.model({
  sourceId: a.string().required(), // Unique identifier "PS_2024_001"
  name: a.string().required(), // "Industrial Facility Alpha"
  description: a.string(), // Detailed description
  sourceType: a.enum([
    "industrial", "agricultural", "waste_site", "spill", 
    "mining", "transportation", "construction", "other"
  ]),
  
  // Geographic Location
  latitude: a.float().required(),
  longitude: a.float().required(),
  address: a.string(),
  city: a.string().required(),
  state: a.string().required(),
  country: a.string().required(),
  
  // Impact Zone Definition
  impactRadius: a.float().required(), // meters
  impactShape: a.enum(["circle", "polygon"]).default("circle"),
  polygonCoordinates: a.json(), // For non-circular zones
  
  // Pollution Details
  primaryContaminants: a.string().array(), // References ContaminantId
  severityLevel: a.enum(["low", "moderate", "high", "critical"]),
  concentrationData: a.json(), // {contaminantId: {value, unit, measuredAt}}
  
  // Administrative
  status: a.enum(["active", "monitored", "remediated", "closed"]),
  reportedAt: a.datetime().required(),
  reportedBy: a.string(), // User ID
  lastUpdated: a.datetime(),
  updatedBy: a.string(),
  
  // Source Information
  dataSource: a.string(), // "field_report", "satellite", "sensor_network"
  sourceUrl: a.string(),
  verificationStatus: a.enum(["unverified", "pending", "verified", "disputed"]),
  notes: a.string(),
  attachments: a.json(), // File URLs/IDs
  
  // Regulatory
  jurisdictionCode: a.string().required(),
  regulatoryStatus: a.enum(["compliant", "violation", "under_review", "unknown"]),
  permitNumbers: a.string().array(),
})
.authorization((allow) => [
  allow.group("admin").to(["create", "update", "delete", "read"]),
  allow.group("scientist").to(["create", "update", "read"]),
  allow.authenticated().to(["read"]) // Read-only for general users
])
.secondaryIndexes((index) => [
  index("sourceType"),
  index("city"),
  index("state"),
  index("status"),
  index("severityLevel"),
  index("reportedAt"),
]);
```

#### PollutionSourceContaminant (Junction Table)
```typescript
PollutionSourceContaminant: a.model({
  sourceId: a.string().required(),
  contaminantId: a.string().required(),
  concentrationValue: a.float(),
  concentrationUnit: a.string(),
  measuredAt: a.datetime(),
  exceedsThreshold: a.boolean(),
  notes: a.string(),
})
.authorization((allow) => [
  allow.group("admin").to(["create", "update", "delete", "read"]),
  allow.group("scientist").to(["create", "update", "read"]),
])
.secondaryIndexes((index) => [
  index("sourceId"),
  index("contaminantId"),
]);
```

## UI/UX Design Specification

### Map Interface Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Admin Portal Header                                         │
├─────────────────────────────────────────────────────────────┤
│ Environmental Data Input - Pollution Sources               │
├──────────────────┬──────────────────────────────────────────┤
│ Sidebar Panel    │                                          │
│                  │                                          │
│ □ Source Types   │                                          │
│ ☑ Industrial     │         Interactive Map                  │
│ ☑ Agricultural   │                                          │
│ □ Waste Sites    │    • Click to place sources             │
│ □ Spills         │    • Drag to adjust radius              │
│                  │    • Color-coded zones                  │
│ Search Location  │    • Layer toggles                      │
│ [___________] 🔍 │                                          │
│                  │                                          │
│ Current Sources  │                                          │
│ • Source A       │                                          │
│ • Source B       │                                          │
│ • Source C       │                                          │
│                  │                                          │
│ [+ Add Source]   │                                          │
├──────────────────┴──────────────────────────────────────────┤
│ Status: 3 sources loaded | Last saved: 2 min ago           │
└─────────────────────────────────────────────────────────────┘
```

### Interactive Components

#### 1. Map Controls
- **Placement Tool**: Single-click to place pollution source marker
- **Radius Adjuster**: Drag handle on circle perimeter to resize impact zone
- **Context Menu**: Right-click for edit/delete/duplicate actions
- **Layer Toggles**: Show/hide existing sources, jurisdictions, elevation

#### 2. Source Details Panel (Slide-out)
```
┌─────────────────────────────────────┐
│ Pollution Source Details            │
├─────────────────────────────────────┤
│ Basic Information                   │
│ Name: [_________________]          │
│ Type: [Industrial ▼]               │
│ Description: [____________]         │
│                                     │
│ Location                           │
│ Coordinates: 45.5088, -73.5878     │
│ Address: [_________________]       │
│ City: [Montreal]                   │
│                                     │
│ Impact Zone                         │
│ Radius: [500] meters              │
│ Shape: ⚪ Circle ⬟ Polygon         │
│                                     │
│ Contaminants                       │
│ + Lead (45 μg/L) ⚠️                │
│ + Nitrate (12,000 μg/L) ❌         │
│ [+ Add Contaminant]                │
│                                     │
│ Status & Verification              │
│ Status: [Active ▼]                 │
│ Severity: [High ▼]                 │
│ Verified: ☑️ Yes                    │
│                                     │
│ [Save] [Cancel] [Delete]           │
└─────────────────────────────────────┘
```

#### 3. Visual Feedback System
- **Color Coding**: 
  - 🟢 Low severity (green, 0.3 opacity)
  - 🟡 Moderate severity (yellow, 0.4 opacity)
  - 🟠 High severity (orange, 0.5 opacity)
  - 🔴 Critical severity (red, 0.6 opacity)
- **Hover States**: Show source details in tooltip
- **Selection States**: Bold outline for selected sources
- **Overlap Visualization**: Darker areas where zones overlap

### Mobile Responsiveness
- **Touch-Friendly Targets**: Minimum 44px touch targets
- **Gesture Support**: Pinch-to-zoom, pan, tap-to-place
- **Responsive Panel**: Slide-up bottom panel on mobile
- **Simplified Controls**: Reduced complexity on smaller screens

### Accessibility Features
- **Keyboard Navigation**: Tab through map controls and form fields
- **Screen Reader Support**: ARIA labels and live regions
- **High Contrast Mode**: Alternative color schemes
- **Focus Indicators**: Clear visual focus states
- **Alternative Input**: Coordinate input for precise placement

## Technical Implementation Plan

### Phase 1: Map Library Integration (Week 1-2)

#### Selected Library: **Mapbox GL JS**
**Rationale**: Best balance of features, performance, and customization

```typescript
// Map component structure
const PollutionSourceMap = () => {
  const [map, setMap] = useState<Map | null>(null);
  const [sources, setSources] = useState<PollutionSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<PollutionSource | null>(null);
  const [isPlacingSource, setIsPlacingSource] = useState(false);

  return (
    <div className="relative h-full">
      <Map
        mapLib={mapboxgl}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{
          latitude: 45.5088,
          longitude: -73.5878,
          zoom: 10
        }}
        style={{width: '100%', height: '100%'}}
        mapStyle="mapbox://styles/mapbox/light-v11"
        onLoad={handleMapLoad}
        onClick={handleMapClick}
        onMouseMove={handleMapMouseMove}
        cursor={isPlacingSource ? 'crosshair' : 'auto'}
      >
        {/* Pollution source markers */}
        {sources.map(source => (
          <PollutionSourceLayer 
            key={source.id}
            source={source}
            onEdit={handleEditSource}
            onDelete={handleDeleteSource}
          />
        ))}
        
        {/* Map controls */}
        <NavigationControl position="top-right" />
        <GeolocateControl position="top-right" />
        <ScaleControl position="bottom-left" />
      </Map>
      
      {/* Source details panel */}
      <SourceDetailsPanel 
        source={selectedSource}
        onSave={handleSaveSource}
        onClose={() => setSelectedSource(null)}
      />
    </div>
  );
};
```

### Phase 2: Database Integration (Week 2-3)

#### GraphQL Mutations
```typescript
// Create pollution source
const CREATE_POLLUTION_SOURCE = `
  mutation CreatePollutionSource($input: CreatePollutionSourceInput!) {
    createPollutionSource(input: $input) {
      id
      sourceId
      name
      latitude
      longitude
      impactRadius
      status
      # ... other fields
    }
  }
`;

// Update source with contaminants
const UPDATE_SOURCE_CONTAMINANTS = `
  mutation UpdateSourceContaminants(
    $sourceId: String!
    $contaminants: [PollutionSourceContaminantInput!]!
  ) {
    updateSourceContaminants(sourceId: $sourceId, contaminants: $contaminants) {
      success
      errors
    }
  }
`;
```

#### Service Layer
```typescript
class PollutionSourceService {
  async createSource(sourceData: CreatePollutionSourceInput) {
    // Validate coordinates
    // Check jurisdiction boundaries
    // Create source record
    // Associate contaminants
    // Trigger notifications if needed
  }

  async calculateImpactZone(
    latitude: number, 
    longitude: number, 
    radius: number
  ): Promise<GeoJSONPolygon> {
    // Generate circle polygon from center + radius
    // Account for Earth curvature
    // Return GeoJSON polygon coordinates
  }

  async checkOverlappingSources(
    latitude: number,
    longitude: number,
    radius: number
  ): Promise<PollutionSource[]> {
    // Query nearby sources within radius
    // Calculate geometric intersections
    // Return overlapping sources for warnings
  }
}
```

### Phase 3: Form Integration (Week 3-4)

#### React Hook Form Setup
```typescript
const sourceFormSchema = z.object({
  name: z.string().min(1, "Source name is required"),
  sourceType: z.enum(["industrial", "agricultural", "waste_site", "spill", "mining", "transportation", "construction", "other"]),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  impactRadius: z.number().min(1).max(50000), // 1m to 50km
  address: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  country: z.string().min(1),
  primaryContaminants: z.array(z.string()),
  severityLevel: z.enum(["low", "moderate", "high", "critical"]),
  status: z.enum(["active", "monitored", "remediated", "closed"]),
  notes: z.string().optional(),
});
```

### Phase 4: Real-time Features (Week 4-5)

#### WebSocket Updates
```typescript
// Real-time collaboration for multiple admins
const useRealtimeSourceUpdates = () => {
  useEffect(() => {
    const subscription = generateClient<Schema>()
      .models.PollutionSource
      .observeQuery()
      .subscribe({
        next: (snapshot) => {
          setSources(snapshot.items);
          // Handle optimistic updates
          // Show "User X is editing source Y" indicators
        }
      });

    return () => subscription.unsubscribe();
  }, []);
};
```

## Map Library Comparison

### 1. **Mapbox GL JS** ⭐ **RECOMMENDED**
**Pros:**
- Excellent performance with large datasets (10k+ sources)
- Rich customization options (custom markers, styling)
- Built-in support for circles, polygons, and complex shapes
- Great mobile touch support
- Vector tiles for crisp rendering at all zoom levels
- Active community and documentation

**Cons:**
- Requires API key and billing (free tier: 50k map loads/month)
- Learning curve for complex customizations
- Bundle size (~500kb)

**Implementation:**
```bash
npm install mapbox-gl react-map-gl
```

### 2. **Leaflet + OpenStreetMap** 
**Pros:**
- Completely free (no API limits)
- Lightweight (~150kb)
- Large ecosystem of plugins
- Simple API, easy to learn

**Cons:**
- Performance issues with >1000 sources
- Limited styling customization
- Manual work needed for mobile optimization
- Raster tiles can appear pixelated on high-DPI screens

### 3. **Google Maps**
**Pros:**
- Familiar interface for users
- Excellent geocoding and place search
- Good mobile support
- High-quality satellite imagery

**Cons:**
- Expensive ($7/1000 map loads after free tier)
- Limited styling options
- Vendor lock-in concerns
- Performance issues with complex overlays

### 4. **Recommendations by Use Case**

| Use Case | Recommended | Alternative |
|----------|-------------|-------------|
| Production deployment | Mapbox GL JS | Leaflet (if budget constrained) |
| Prototype/MVP | Leaflet | Google Maps |
| High data volume (>5k sources) | Mapbox GL JS | None suitable |
| Offline capability needed | Leaflet + MBTiles | Mapbox (with caching) |

## Performance Considerations

### Data Loading Strategy
- **Viewport-based Loading**: Only load sources visible in current map bounds
- **Clustering**: Group nearby sources at low zoom levels
- **Progressive Disclosure**: Show basic markers, load details on demand
- **Caching**: Local storage for frequently accessed areas

### Optimization Techniques
```typescript
// Viewport-based querying
const loadSourcesInBounds = useMemo(() => 
  debounce(async (bounds: LatLngBounds) => {
    const sources = await client.models.PollutionSource.list({
      filter: {
        and: [
          { latitude: { between: [bounds.south, bounds.north] } },
          { longitude: { between: [bounds.west, bounds.east] } }
        ]
      },
      limit: 500
    });
    setSources(sources.data);
  }, 300),
  []
);
```

### Multiple Overlapping Zones
- **Visual Stacking**: Use opacity and z-index for overlap visualization
- **Interaction Priority**: Topmost source receives click events
- **Performance**: Limit concurrent visible zones (recommend max 100)

## Integration Points

### Existing Admin Portal
- **Route**: `/admin/pollution-sources`
- **Navigation**: Add to sidebar under "Environmental Data"
- **Permissions**: Extend existing admin group permissions
- **Styling**: Use existing Shadcn/ui components and Tailwind classes

### Data Pipeline
- **Import Workflow**: Bulk import from CSV/Excel files
- **API Integration**: Connect to external environmental databases
- **Export Functions**: Generate reports and data exports
- **Validation**: Cross-reference with existing contaminant database

### Mobile App Integration
- **Public API**: Expose pollution source data via GraphQL queries
- **Push Notifications**: Alert users entering contamination zones
- **Offline Maps**: Cache critical pollution data for offline access

## Testing Strategy

### Unit Tests
- Map interaction handlers
- Coordinate calculations
- Form validation logic
- Data transformation functions

### Integration Tests
- Database CRUD operations
- GraphQL mutations and queries
- Authentication/authorization
- File upload workflows

### E2E Tests (Playwright)
```typescript
test('Environmental scientist creates pollution source', async ({ page }) => {
  // Navigate to pollution sources page
  await page.goto('/admin/pollution-sources');
  
  // Click map to place source
  await page.click('.mapboxgl-canvas', { position: { x: 400, y: 300 } });
  
  // Fill source details form
  await page.fill('[name="name"]', 'Test Industrial Site');
  await page.selectOption('[name="sourceType"]', 'industrial');
  await page.fill('[name="impactRadius"]', '1000');
  
  // Add contaminant
  await page.click('[data-testid="add-contaminant"]');
  await page.selectOption('[name="contaminantId"]', 'lead');
  await page.fill('[name="concentrationValue"]', '45');
  
  // Save source
  await page.click('[data-testid="save-source"]');
  
  // Verify success
  await expect(page.locator('.toast-success')).toBeVisible();
  await expect(page.locator('[data-testid="source-marker"]')).toBeVisible();
});
```

### Manual Testing Scenarios
1. **Source Creation Workflow**: Complete end-to-end source creation
2. **Map Interaction**: Pan, zoom, marker placement, radius adjustment
3. **Form Validation**: Required fields, data types, range limits
4. **Mobile Responsiveness**: Touch interactions, panel behavior
5. **Performance**: Loading 1000+ sources, map rendering speed
6. **Accessibility**: Keyboard navigation, screen reader compatibility

## Deployment Checklist

### Environment Setup
- [ ] Mapbox API key configured
- [ ] Database schema deployed
- [ ] GraphQL schema updated
- [ ] Environment variables set
- [ ] CDN assets configured

### Security
- [ ] API rate limiting implemented
- [ ] User permissions validated
- [ ] Input sanitization in place
- [ ] HTTPS enforcement
- [ ] CORS configuration

### Monitoring
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] User analytics
- [ ] Database query optimization
- [ ] API usage monitoring

## Future Enhancements

### Phase 2 Features
- **Temporal Data**: Track pollution levels over time
- **Predictive Modeling**: AI-powered contamination spread prediction
- **Multi-layer Visualization**: Overlay weather, population density
- **3D Terrain**: Elevation-aware contamination modeling

### Advanced Analytics
- **Risk Assessment**: Automated risk scoring based on multiple factors
- **Population Impact**: Calculate affected population counts
- **Regulatory Compliance**: Automated violation detection
- **Reporting Dashboard**: Executive summaries and trend analysis

## Success Metrics

### User Experience
- **Time to Create Source**: Target <2 minutes from map click to save
- **User Adoption**: 80% of environmental scientists using feature within 3 months
- **Error Rate**: <5% form submission failures
- **Mobile Usage**: 30% of sessions on mobile devices

### Technical Performance
- **Map Load Time**: <3 seconds initial load
- **Source Rendering**: Handle 1000+ sources without lag
- **Data Accuracy**: 99.9% coordinate precision
- **Uptime**: 99.9% availability SLA

### Business Impact
- **Data Quality**: 50% increase in pollution source data completeness
- **Response Time**: 25% faster incident response through better visualization
- **Scientific Productivity**: 40% reduction in data entry time
- **Regulatory Compliance**: Improved documentation and audit trails

---

*This specification serves as the comprehensive technical and UX blueprint for implementing the map-based environmental data input feature for MapYourHealth's admin portal. It can be used to either enhance existing Issue #178 or serve as a new feature specification.*
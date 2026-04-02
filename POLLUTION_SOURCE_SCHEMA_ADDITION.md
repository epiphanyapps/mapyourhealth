# Pollution Source Schema Addition

This document outlines the database schema additions needed for the pollution source mapping feature. These additions should be integrated into the existing `packages/backend/amplify/data/resource.ts` file.

## Schema Additions

Add the following models to the existing schema object in `resource.ts`:

```typescript
// Add to existing schema object

/**
 * PollutionSource - represents a geographic pollution source with impact zone
 * Used by environmental scientists to map contamination sources
 * Public read for map display, admin/scientist write permissions
 */
PollutionSource: a
  .model({
    sourceId: a.string().required(), // Unique identifier "PS_2024_001"
    name: a.string().required(), // "Industrial Facility Alpha"
    description: a.string(), // Detailed description
    sourceType: a.enum([
      "industrial", 
      "agricultural", 
      "waste_site", 
      "spill", 
      "mining", 
      "transportation", 
      "construction", 
      "other"
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
    polygonCoordinates: a.json(), // For non-circular zones: [[lat,lng], ...]
    
    // Pollution Details
    primaryContaminants: a.string().array(), // References Contaminant.contaminantId
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
    jurisdictionCode: a.string().required(), // References Jurisdiction.code
    regulatoryStatus: a.enum(["compliant", "violation", "under_review", "unknown"]),
    permitNumbers: a.string().array(),
  })
  .authorization((allow) => [
    allow.guest().to(["read"]), // Public read for mobile app
    allow.authenticated().to(["read"]),
    allow.group("admin").to(["create", "update", "delete", "read"]),
    allow.group("scientist").to(["create", "update", "read"]), // Environmental scientists
  ])
  .secondaryIndexes((index) => [
    index("sourceId"),
    index("sourceType"),
    index("city"),
    index("state"),
    index("status"),
    index("severityLevel"),
    index("reportedAt"),
    index("jurisdictionCode"),
    // Geospatial query support
    index("latitude"),
    index("longitude"),
  ]),

/**
 * PollutionSourceContaminant - junction table for source-contaminant relationships
 * Stores detailed contamination data per source
 * Admin/scientist write, public read
 */
PollutionSourceContaminant: a
  .model({
    sourceId: a.string().required(), // References PollutionSource.id
    contaminantId: a.string().required(), // References Contaminant.contaminantId
    concentrationValue: a.float(),
    concentrationUnit: a.string(),
    measuredAt: a.datetime(),
    exceedsThreshold: a.boolean(),
    thresholdValue: a.float(), // Cached threshold for this jurisdiction
    safetyLevel: a.enum(["safe", "warning", "danger", "unknown"]),
    notes: a.string(),
    testMethod: a.string(), // How concentration was determined
    labCertified: a.boolean().default(false), // Lab-certified vs field measurement
  })
  .authorization((allow) => [
    allow.guest().to(["read"]),
    allow.authenticated().to(["read"]),
    allow.group("admin").to(["create", "update", "delete", "read"]),
    allow.group("scientist").to(["create", "update", "read"]),
  ])
  .secondaryIndexes((index) => [
    index("sourceId"),
    index("contaminantId"),
    index("safetyLevel"),
    index("measuredAt"),
  ]),

/**
 * PollutionSourceHistory - audit trail for pollution source changes
 * Tracks all modifications for regulatory compliance
 * System-managed, admin read-only
 */
PollutionSourceHistory: a
  .model({
    sourceId: a.string().required(),
    changeType: a.enum(["created", "updated", "deleted", "status_changed", "contaminant_added", "contaminant_removed"]),
    changedBy: a.string().required(), // User ID
    changedAt: a.datetime().required(),
    previousValues: a.json(), // Snapshot of previous state
    newValues: a.json(), // Snapshot of new state
    changeReason: a.string(), // Why the change was made
    automaticChange: a.boolean().default(false), // System vs user change
  })
  .authorization((allow) => [
    allow.group("admin").to(["read"]),
    // System writes via Lambda functions with IAM roles
  ])
  .secondaryIndexes((index) => [
    index("sourceId"),
    index("changedAt"),
    index("changedBy"),
  ]),

/**
 * PollutionAlert - automated alerts when sources meet certain criteria
 * Triggered by data updates or threshold violations
 * Admin management, public read for affected users
 */
PollutionAlert: a
  .model({
    sourceId: a.string().required(),
    alertType: a.enum([
      "threshold_exceeded", 
      "new_contamination", 
      "status_changed", 
      "cleanup_completed"
    ]),
    severity: a.enum(["info", "warning", "critical"]),
    title: a.string().required(),
    message: a.string().required(),
    affectedArea: a.json(), // GeoJSON polygon of affected area
    
    // Geographic scope
    city: a.string().required(),
    state: a.string().required(),
    country: a.string().required(),
    jurisdictionCode: a.string().required(),
    
    // Alert lifecycle
    isActive: a.boolean().default(true),
    createdAt: a.datetime().required(),
    resolvedAt: a.datetime(),
    resolvedBy: a.string(),
    resolutionNotes: a.string(),
    
    // Notification tracking
    notificationsSent: a.integer().default(0),
    lastNotificationAt: a.datetime(),
    
    // External integration
    reportedToAuthorities: a.boolean().default(false),
    authorityReference: a.string(), // Reference number from regulatory body
  })
  .authorization((allow) => [
    allow.guest().to(["read"]), // Public alerts
    allow.authenticated().to(["read"]),
    allow.group("admin").to(["create", "update", "delete", "read"]),
    allow.group("scientist").to(["create", "update", "read"]),
  ])
  .secondaryIndexes((index) => [
    index("sourceId"),
    index("alertType"),
    index("severity"),
    index("isActive"),
    index("createdAt"),
    index("city"),
    index("state"),
  ]),
```

## Authorization Updates

Add a new user group for environmental scientists:

```typescript
// In amplify/auth/resource.ts, add to groups:
groups: {
  admin: "Administrators with full access",
  scientist: "Environmental scientists and data collectors", // ADD THIS
}
```

## Custom Queries/Mutations

Add these custom operations to the schema:

```typescript
// Add to existing custom queries/mutations section

/**
 * Query pollution sources within a geographic bounding box
 * Optimized for map viewport queries
 */
queryPollutionSourcesInBounds: a
  .query()
  .arguments({
    northLatitude: a.float().required(),
    southLatitude: a.float().required(),
    eastLongitude: a.float().required(),
    westLongitude: a.float().required(),
    severityFilter: a.string(), // "low,moderate,high,critical" comma-separated
    statusFilter: a.string(), // "active,monitored,remediated,closed" comma-separated
    sourceTypeFilter: a.string(), // comma-separated source types
    limit: a.integer().default(500),
  })
  .returns(a.customType({
    sources: a.json(), // Array of PollutionSource with contaminant details
    totalCount: a.integer(),
    boundingBoxMeta: a.json(), // Statistics about the query area
  }))
  .authorization((allow) => [
    allow.guest(),
    allow.authenticated(),
  ])
  .handler(a.handler.function("queryPollutionSourcesInBounds")),

/**
 * Calculate risk assessment for a specific location
 * Accounts for all nearby pollution sources and their impact zones
 */
calculateLocationRisk: a
  .query()
  .arguments({
    latitude: a.float().required(),
    longitude: a.float().required(),
    radius: a.float().default(5000), // Search radius in meters
  })
  .returns(a.customType({
    overallRisk: a.enum(["low", "moderate", "high", "critical"]),
    affectingSources: a.json(), // Array of sources affecting this location
    contaminantRisks: a.json(), // Risk breakdown by contaminant type
    recommendations: a.string(), // AI-generated recommendations
    nearestSafeDistance: a.float(), // Distance to nearest safe area
  }))
  .authorization((allow) => [
    allow.guest(),
    allow.authenticated(),
  ])
  .handler(a.handler.function("calculateLocationRisk")),

/**
 * Bulk import pollution sources from CSV/Excel files
 * Admin-only operation for data migration
 */
bulkImportPollutionSources: a
  .mutation()
  .arguments({
    fileUrl: a.string().required(), // S3 URL of uploaded CSV/Excel
    importOptions: a.json(), // Column mappings, validation rules
    dryRun: a.boolean().default(true), // Validate without importing
  })
  .returns(a.customType({
    success: a.boolean().required(),
    importedCount: a.integer().required(),
    errorCount: a.integer().required(),
    errors: a.json(), // Array of validation errors
    warnings: a.json(), // Array of warnings
    previewData: a.json(), // First 10 rows for preview
  }))
  .authorization((allow) => [
    allow.group("admin"),
  ])
  .handler(a.handler.function("bulkImportPollutionSources")),
```

## Required Lambda Functions

Create these Lambda functions in `amplify/functions/`:

### 1. queryPollutionSourcesInBounds
```typescript
// amplify/functions/query-pollution-sources-in-bounds/handler.ts
export const handler = async (event: any) => {
  // Implement geospatial bounding box query
  // Use DynamoDB GSI for efficient lat/lng filtering
  // Include related contaminant data
  // Apply filters for severity, status, source type
  // Return paginated results with metadata
};
```

### 2. calculateLocationRisk
```typescript
// amplify/functions/calculate-location-risk/handler.ts
export const handler = async (event: any) => {
  // Find all pollution sources within radius
  // Calculate distance-based impact scores
  // Cross-reference with contaminant thresholds
  // Generate overall risk assessment
  // Provide actionable recommendations
};
```

### 3. bulkImportPollutionSources
```typescript
// amplify/functions/bulk-import-pollution-sources/handler.ts
export const handler = async (event: any) => {
  // Parse CSV/Excel from S3
  // Validate data against schema
  // Geocode addresses if needed
  // Batch insert with error handling
  // Generate import report
};
```

## Migration Script

Create a migration script to populate initial data:

```typescript
// scripts/seed-pollution-sources.ts
import { generateClient } from "aws-amplify/data";

const sampleSources = [
  {
    sourceId: "PS_2024_001",
    name: "Montreal Industrial Complex",
    sourceType: "industrial",
    latitude: 45.5088,
    longitude: -73.5878,
    impactRadius: 2000,
    city: "Montreal",
    state: "QC",
    country: "CA",
    jurisdictionCode: "CA-QC",
    primaryContaminants: ["lead", "mercury"],
    severityLevel: "high",
    status: "active",
    reportedAt: new Date().toISOString(),
    reportedBy: "admin",
  },
  // Add more sample data...
];

export async function seedPollutionSources() {
  const client = generateClient();
  
  for (const source of sampleSources) {
    await client.models.PollutionSource.create(source);
  }
  
  console.log(`Seeded ${sampleSources.length} pollution sources`);
}
```

## Environment Variables

Add these to your environment configuration:

```bash
# Mapbox API key for map rendering
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here

# Geospatial query optimization
ENABLE_GEOSPATIAL_INDEXING=true

# Alert thresholds
POLLUTION_ALERT_RADIUS_MAX=50000  # 50km max alert radius
POLLUTION_BULK_IMPORT_MAX_ROWS=10000
```

## Performance Considerations

### Database Optimizations
1. **Geospatial Indexing**: Create composite indexes on lat/lng for efficient bounding box queries
2. **Caching Strategy**: Cache frequently accessed pollution sources in Redis/ElastiCache
3. **Read Replicas**: Use DynamoDB Global Secondary Indexes for read scaling

### Query Optimization
```typescript
// Efficient bounding box query pattern
const querySourcesInBounds = async (bounds: BoundingBox) => {
  return await client.models.PollutionSource.list({
    filter: {
      and: [
        { latitude: { between: [bounds.south, bounds.north] } },
        { longitude: { between: [bounds.west, bounds.east] } },
        { status: { eq: "active" } }
      ]
    },
    limit: 500 // Prevent large result sets
  });
};
```

### Frontend Optimizations
1. **Viewport-based Loading**: Only fetch sources visible in current map view
2. **Source Clustering**: Group nearby sources at low zoom levels
3. **Progressive Disclosure**: Load basic data first, details on demand
4. **Debounced Updates**: Rate-limit map move events

This schema addition provides a comprehensive foundation for the pollution source mapping feature while maintaining consistency with the existing MapYourHealth data architecture.
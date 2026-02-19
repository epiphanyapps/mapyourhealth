import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { placesAutocomplete } from "../functions/places-autocomplete/resource";

/**
 * MapYourHealth Data Schema
 *
 * @see https://docs.amplify.aws/react-native/build-a-backend/data/
 */

const schema = a.schema({
  // =========================================================================
  // Custom Types for Places Autocomplete
  // =========================================================================

  /**
   * PlacesPrediction - Google Places autocomplete prediction
   */
  PlacesPrediction: a.customType({
    place_id: a.string().required(),
    description: a.string().required(),
    main_text: a.string(),
    secondary_text: a.string(),
  }),

  /**
   * PlacesAutocompleteResponse - Response from Places Autocomplete query
   */
  PlacesAutocompleteResponse: a.customType({
    status: a.string().required(),
    predictions: a.json(), // Array of PlacesPrediction
    lat: a.float(), // For place details response
    lng: a.float(), // For place details response
    cached: a.boolean(),
    error: a.string(),
  }),

  // =========================================================================
  // Custom Queries
  // =========================================================================

  /**
   * placesAutocomplete - Secure proxy for Google Places API
   * Keeps API key server-side with caching
   */
  placesAutocomplete: a
    .query()
    .arguments({
      query: a.string().required(),
      sessionToken: a.string(),
    })
    .returns(a.ref("PlacesAutocompleteResponse"))
    .authorization((allow) => [allow.guest(), allow.authenticated()])
    .handler(a.handler.function(placesAutocomplete)),

  // Existing health tracking model
  HealthRecord: a
    .model({
      date: a.date().required(),
      type: a.enum([
        "WEIGHT",
        "BLOOD_PRESSURE",
        "HEART_RATE",
        "BLOOD_SUGAR",
        "STEPS",
        "SLEEP",
        "OTHER",
      ]),
      value: a.float().required(),
      unit: a.string(),
      notes: a.string(),
    })
    .authorization((allow) => [allow.owner()]),

  // =========================================================================
  // Contaminants and Safety Data (Jurisdiction-Aware)
  // =========================================================================

  /**
   * Contaminant - defines water contaminants
   * Includes 172+ contaminants: fertilizers, pesticides, radioactive, etc.
   * Public read, admin write
   */
  Contaminant: a
    .model({
      contaminantId: a.string().required(), // "nitrate", "lead", "atrazine"
      name: a.string().required(), // Display name: "Nitrate"
      nameFr: a.string(), // French name: "Nitrate"
      category: a.enum([
        "fertilizer",
        "pesticide",
        "radioactive",
        "disinfectant",
        "inorganic",
        "organic",
        "microbiological",
      ]),
      unit: a.string().required(), // "μg/L", "Bq/L"
      description: a.string(), // Health concerns (EN)
      descriptionFr: a.string(), // Health concerns (FR)
      studies: a.string(), // Scientific references
      higherIsBad: a.boolean().default(true),
    })
    .authorization((allow) => [
      allow.guest().to(["read"]),
      allow.authenticated().to(["read"]),
      allow.group("admin").to(["create", "update", "delete", "read"]),
    ])
    .secondaryIndexes((index) => [index("contaminantId")]),

  /**
   * ContaminantThreshold - jurisdiction-specific limits for contaminants
   * Examples: WHO=50000, CA-QC=10000, US-NY=10000, banned in some jurisdictions
   * Public read, admin write
   */
  ContaminantThreshold: a
    .model({
      contaminantId: a.string().required(), // References Contaminant.contaminantId
      jurisdictionCode: a.string().required(), // "WHO", "CA-QC", "US-NY", "US-CA", "US-TX", "US-FL", "EU"
      limitValue: a.float(), // null if banned or not controlled
      warningRatio: a.float().default(0.8), // Warning threshold as ratio of limit (e.g., 0.8 = 80%)
      status: a.enum([
        "regulated", // Has a specific limit
        "banned", // Completely prohibited
        "not_approved", // Not approved for use
        "not_controlled", // No regulation exists
      ]),
    })
    .authorization((allow) => [
      allow.guest().to(["read"]),
      allow.authenticated().to(["read"]),
      allow.group("admin").to(["create", "update", "delete", "read"]),
    ])
    .secondaryIndexes((index) => [
      index("contaminantId"),
      index("jurisdictionCode"),
    ]),

  /**
   * Jurisdiction - reference table for regulatory jurisdictions
   * Supports hierarchy: federal → state/province
   * Public read, admin write
   */
  Jurisdiction: a
    .model({
      code: a.string().required(), // "US-NY", "CA-QC", "WHO", "EU"
      name: a.string().required(), // "New York State", "Quebec", "World Health Organization"
      nameFr: a.string(), // French name
      country: a.string().required(), // "US", "CA", "INTL"
      region: a.string(), // "NY", "QC" (state/province code)
      parentCode: a.string(), // "US" for federal fallback, null for top-level
      isDefault: a.boolean().default(false), // True for WHO (global default)
    })
    .authorization((allow) => [
      allow.guest().to(["read"]),
      allow.authenticated().to(["read"]),
      allow.group("admin").to(["create", "update", "delete", "read"]),
    ])
    .secondaryIndexes((index) => [index("code"), index("country")]),

  /**
   * Location - maps cities/counties to jurisdictions
   * Granularity: Country → State/Province → County/Region → City
   * No postal code / ZIP code level data
   * Public read, admin write
   */
  Location: a
    .model({
      city: a.string().required(), // City name
      county: a.string(), // County or region name
      state: a.string().required(), // State/province code (NY, QC, etc.)
      country: a.string().required(), // "US", "CA"
      jurisdictionCode: a.string().required(), // Which regulations apply: "US-NY", "CA-QC"
      latitude: a.float(),
      longitude: a.float(),
    })
    .authorization((allow) => [
      allow.guest().to(["read"]),
      allow.authenticated().to(["read"]),
      allow.group("admin").to(["create", "update", "delete", "read"]),
    ])
    .secondaryIndexes((index) => [
      index("jurisdictionCode"),
      index("city"),   // Query locations by city
      index("state"),  // Query locations by state
      index("county"), // Query locations by county
      index("country"), // Query locations by country
    ]),

  /**
   * LocationMeasurement - actual contaminant measurements for locations
   * Keyed by city+state instead of postal code
   * Public read, admin write
   */
  LocationMeasurement: a
    .model({
      city: a.string().required(), // City name
      state: a.string().required(), // State/province code
      country: a.string().required(), // "US", "CA"
      contaminantId: a.string().required(),
      value: a.float().required(),
      measuredAt: a.datetime().required(),
      source: a.string(), // Data source: "EPA", "MELCC", etc.
      sourceUrl: a.string(), // Link to source data
      notes: a.string(),
    })
    .authorization((allow) => [
      allow.guest().to(["read"]),
      allow.authenticated().to(["read"]),
      allow.group("admin").to(["create", "update", "delete", "read"]),
    ])
    .secondaryIndexes((index) => [
      index("city"),
      index("state"),
      index("contaminantId"),
    ]),

  /**
   * UserSubscription - location following with notification preferences
   * Subscriptions are at city level (no postal codes)
   * Owner only
   */
  UserSubscription: a
    .model({
      city: a.string().required(), // City name
      state: a.string().required(), // State/province code
      country: a.string().required(), // "US", "CA"
      county: a.string(), // County/region (optional)
      // Notification preferences
      enablePush: a.boolean().default(true),
      enableEmail: a.boolean().default(false),
      alertOnDanger: a.boolean().default(true),
      alertOnWarning: a.boolean().default(false),
      alertOnAnyChange: a.boolean().default(false),
      // Specific contaminants to watch (null = all)
      watchContaminants: a.string().array(),
      notifyWhenDataAvailable: a.boolean().default(false),
      // Push notification token (Expo Push)
      expoPushToken: a.string(),
    })
    .authorization((allow) => [allow.owner()])
    .secondaryIndexes((index) => [index("city"), index("state")]),

  /**
   * NotificationLog - audit trail for sent notifications
   * Lambda writes via IAM, users can read their own, admin can read all
   */
  NotificationLog: a
    .model({
      subscriptionId: a.string().required(),
      userId: a.string().required(),
      city: a.string().required(), // City name
      state: a.string().required(), // State/province code
      country: a.string().required(), // "US", "CA"
      type: a.enum(["push", "email"]),
      status: a.enum(["pending", "sent", "failed", "delivered"]),
      title: a.string().required(),
      body: a.string().required(),
      sentAt: a.datetime(),
      deliveredAt: a.datetime(),
      error: a.string(),
      // Context for what triggered the notification
      triggerType: a.enum(["data_update", "data_available", "status_change"]),
      contaminantId: a.string(), // If notification was about specific contaminant
    })
    .authorization((allow) => [
      allow.authenticated().to(["read"]), // Users can read (filter by userId in app)
      allow.group("admin").to(["read", "delete"]),
      // Lambda functions use resource-based IAM policies to write
    ])
    .secondaryIndexes((index) => [
      index("city"),
      index("userId"),
    ]),

  /**
   * Hazard reports - user-submitted reports
   * Owner can create/read, admin can manage all
   */
  HazardReport: a
    .model({
      category: a.enum(["water", "air", "health", "disaster"]),
      description: a.string().required(),
      location: a.string().required(),
      city: a.string(),
      state: a.string(),
      country: a.string(),
      status: a.enum(["pending", "reviewed", "resolved", "dismissed"]),
      adminNotes: a.string(),
    })
    .authorization((allow) => [
      allow.owner().to(["create", "read"]),
      allow.group("admin").to(["create", "update", "delete", "read"]),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});

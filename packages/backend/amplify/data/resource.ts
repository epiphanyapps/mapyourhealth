import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/**
 * MapYourHealth Data Schema
 *
 * @see https://docs.amplify.aws/react-native/build-a-backend/data/
 */

const schema = a.schema({
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
   * Location - maps zip/postal codes to jurisdictions
   * Enables looking up which regulations apply to a location
   * Public read, admin write
   */
  Location: a
    .model({
      postalCode: a.string().required(), // ZIP or postal code
      city: a.string(),
      state: a.string(), // State/province code
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
    .secondaryIndexes((index) => [index("postalCode"), index("jurisdictionCode")]),

  /**
   * LocationMeasurement - actual contaminant measurements for locations
   * Public read, admin write
   */
  LocationMeasurement: a
    .model({
      postalCode: a.string().required(),
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
      index("postalCode"),
      index("contaminantId"),
    ]),

  /**
   * UserSubscription - location following with notification preferences
   * Owner only
   */
  UserSubscription: a
    .model({
      postalCode: a.string().required(),
      cityName: a.string(),
      state: a.string(),
      country: a.string(),
      // Notification preferences
      enablePush: a.boolean().default(true),
      enableEmail: a.boolean().default(false),
      alertOnDanger: a.boolean().default(true),
      alertOnWarning: a.boolean().default(false),
      alertOnAnyChange: a.boolean().default(false),
      // Specific contaminants to watch (null = all)
      watchContaminants: a.string().array(),
      notifyWhenDataAvailable: a.boolean().default(false),
    })
    .authorization((allow) => [allow.owner()])
    .secondaryIndexes((index) => [index("postalCode")]),

  /**
   * Hazard reports - user-submitted reports
   * Owner can create/read, admin can manage all
   */
  HazardReport: a
    .model({
      category: a.enum(["water", "air", "health", "disaster"]),
      description: a.string().required(),
      location: a.string().required(),
      zipCode: a.string(),
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

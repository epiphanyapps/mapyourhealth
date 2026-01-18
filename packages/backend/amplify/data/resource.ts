import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

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
      type: a.enum(['WEIGHT', 'BLOOD_PRESSURE', 'HEART_RATE', 'BLOOD_SUGAR', 'STEPS', 'SLEEP', 'OTHER']),
      value: a.float().required(),
      unit: a.string(),
      notes: a.string(),
    })
    .authorization((allow) => [allow.owner()]),

  // Safety Dashboard Models

  /**
   * Stat definitions - describes each safety metric
   * Public read, admin write
   */
  StatDefinition: a
    .model({
      statId: a.string().required(),
      name: a.string().required(),
      unit: a.string().required(),
      description: a.string(),
      category: a.enum(['water', 'air', 'health', 'disaster']),
      dangerThreshold: a.float().required(),
      warningThreshold: a.float().required(),
      higherIsBad: a.boolean().default(true),
    })
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.authenticated().to(['read']),
      allow.group('admin').to(['create', 'update', 'delete', 'read']),
    ]),

  /**
   * Zip code stats - actual measurements for each location
   * Public read, admin write
   */
  ZipCodeStat: a
    .model({
      zipCode: a.string().required(),
      statId: a.string().required(),
      value: a.float().required(),
      status: a.enum(['danger', 'warning', 'safe']),
      lastUpdated: a.datetime().required(),
      source: a.string(),
    })
    .authorization((allow) => [
      allow.guest().to(['read']),
      allow.authenticated().to(['read']),
      allow.group('admin').to(['create', 'update', 'delete', 'read']),
    ])
    .secondaryIndexes((index) => [
      index('zipCode'),
    ]),

  /**
   * User subscriptions - zip codes users are monitoring
   * Owner only
   */
  Subscription: a
    .model({
      zipCode: a.string().required(),
      cityName: a.string(),
      state: a.string(),
      enableNotifications: a.boolean().default(true),
    })
    .authorization((allow) => [allow.owner()]),

  /**
   * Hazard reports - user-submitted reports
   * Owner can create/read, admin can manage all
   */
  HazardReport: a
    .model({
      category: a.enum(['water', 'air', 'health', 'disaster']),
      description: a.string().required(),
      location: a.string().required(),
      zipCode: a.string(),
      status: a.enum(['pending', 'reviewed', 'resolved', 'dismissed']),
      adminNotes: a.string(),
    })
    .authorization((allow) => [
      allow.owner().to(['create', 'read']),
      allow.group('admin').to(['create', 'update', 'delete', 'read']),
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});

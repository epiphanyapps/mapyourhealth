import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/**
 * MapYourHealth Data Schema
 *
 * @see https://docs.amplify.aws/react-native/build-a-backend/data/
 */

const schema = a.schema({
  HealthRecord: a
    .model({
      date: a.date().required(),
      type: a.enum(['WEIGHT', 'BLOOD_PRESSURE', 'HEART_RATE', 'BLOOD_SUGAR', 'STEPS', 'SLEEP', 'OTHER']),
      value: a.float().required(),
      unit: a.string(),
      notes: a.string(),
    })
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});

import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

/**
 * Data schema placeholder
 *
 * Add your data models here when ready.
 * @see https://docs.amplify.aws/react-native/build-a-backend/data/
 */

const schema = a.schema({
  // Placeholder model - replace with your actual models
  Placeholder: a
    .model({
      content: a.string(),
    })
    .authorization((allow) => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});

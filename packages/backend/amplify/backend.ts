import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { sendNotifications } from './functions/send-notifications/resource';
// import { storage } from './storage/resource';

/**
 * MapYourHealth Backend
 *
 * @see https://docs.amplify.aws/react-native/build-a-backend/
 */
defineBackend({
  auth,
  data,
  sendNotifications,
  // storage,
});

import { defineStorage } from '@aws-amplify/backend';

/**
 * Storage configuration placeholder
 *
 * Uncomment and customize when ready to add storage.
 * @see https://docs.amplify.aws/react-native/build-a-backend/storage/
 */

export const storage = defineStorage({
  name: 'mapyourhealthStorage',
  access: (allow) => ({
    'profile-pictures/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
    ],
    'public/*': [
      allow.authenticated.to(['read']),
      allow.guest.to(['read']),
    ],
    // Tenant-scoped landing-page assets uploaded from the admin CMS.
    // Readable by the world (used on the public landing page).
    'tenants/*': [
      allow.guest.to(['read']),
      allow.authenticated.to(['read']),
      allow.groups(['admin']).to(['read', 'write', 'delete']),
    ],
  }),
});

/**
 * These are configuration settings for the dev environment.
 *
 * Do not include API secrets in this file or anywhere in your JS.
 *
 * https://reactnative.dev/docs/security#storing-sensitive-info
 */
export default {
  API_URL: "https://api.rss2json.com/v1/",
  // Magic Link API URL - populated from Amplify backend outputs after deployment
  // Format: https://<function-id>.lambda-url.<region>.on.aws/
  MAGIC_LINK_API_URL: "",
}

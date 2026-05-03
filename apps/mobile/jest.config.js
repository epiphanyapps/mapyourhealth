/** @type {import('@jest/types').Config.ProjectConfig} */
module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/test/setup.ts"],
  // Playwright specs live in apps/mobile/e2e/web/ and must be invoked via
  // `npx playwright test`. When picked up by Jest they throw at import
  // time ("Playwright Test needs to be invoked via 'npx playwright
  // test'") and turn an otherwise-green run into "Test Suites: 5 failed",
  // even though every actual test passes. Excluding the e2e tree makes
  // the jest summary honest.
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/e2e/"],
}

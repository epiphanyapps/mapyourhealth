/**
 * Jest config for the process-notifications Lambda.
 *
 * Mirrors the per-function pattern established by
 * subscribe-to-newsletter, confirm-newsletter, and
 * on-location-measurement-update. Run from this directory with:
 *
 *   npx jest --config jest.config.js
 *
 * Or from the backend root:
 *
 *   npx jest --config amplify/functions/process-notifications/jest.config.js
 */
/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  rootDir: ".",
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: false,
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          esModuleInterop: true,
          verbatimModuleSyntax: false,
        },
      },
    ],
  },
}

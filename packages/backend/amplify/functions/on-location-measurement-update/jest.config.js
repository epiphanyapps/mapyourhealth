/**
 * Jest config for the on-location-measurement-update Lambda.
 *
 * The backend repo doesn't have a workspace-level jest setup; per-function
 * configs are the existing pattern (see subscribe-to-newsletter and
 * confirm-newsletter for prior art). Run from this directory with:
 *
 *   npx jest --config jest.config.js
 *
 * Or from the backend root:
 *
 *   npx jest --config amplify/functions/on-location-measurement-update/jest.config.js
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

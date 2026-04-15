const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@mapyourhealth/backend/(.*)$": "<rootDir>/../../packages/backend/$1",
    "^@mapyourhealth/landing-ui$": "<rootDir>/../../packages/landing-ui/src/index.ts",
    "^@mapyourhealth/landing-ui/(.*)$": "<rootDir>/../../packages/landing-ui/$1",
  },
};

module.exports = createJestConfig(config);

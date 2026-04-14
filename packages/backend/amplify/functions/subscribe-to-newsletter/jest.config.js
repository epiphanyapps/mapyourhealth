/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
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
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^../../data/resource$": "<rootDir>/__mocks__/resource.ts",
    "^\\$amplify/env/.*$": "<rootDir>/__mocks__/amplify-env.ts",
    "^@aws-amplify/backend/function/runtime$": "<rootDir>/__mocks__/amplify-runtime.ts",
  },
};

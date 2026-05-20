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
};

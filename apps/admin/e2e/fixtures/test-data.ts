/**
 * E2E Test Data
 *
 * Shared test data and configuration for E2E tests.
 * Environment variables can be used for sensitive data like credentials.
 */

export const testUrls = {
  admin: "http://localhost:3000",
  mobileWeb: "http://localhost:8081",
};

export const testCities = {
  default: "Beverly Hills",
  search: "New York",
};

export const adminCredentials = {
  email: process.env.ADMIN_TEST_EMAIL || "admin@example.com",
  password: process.env.ADMIN_TEST_PASSWORD || "TestPassword123!",
};

export const testUserCredentials = {
  email: process.env.TEST_USER_EMAIL || "testuser@example.com",
  password: process.env.TEST_USER_PASSWORD || "TestPassword123!",
};

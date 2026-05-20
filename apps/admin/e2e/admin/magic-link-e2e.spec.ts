/**
 * E2E Test: Magic Link Email Delivery
 *
 * Anchors Rayane's 2026-05-15 review finding: requesting a magic link
 * succeeded at the API level but the email was silently dropped because
 * SESClient was constructed in ca-central-1 (sandbox), where SES rejects
 * sends to unverified recipients.
 *
 * A mocked Jest unit test (request-magic-link/handler.test.ts) covers the
 * handler logic but cannot detect that class of failure — only an actual
 * send through real SES against a real receiving address can.
 *
 * This spec generates a unique address at `e2e.mapyourhealth.info` (which
 * is configured to deliver to S3 via SES receive rules — see
 * docs/E2E_EMAIL_TESTING.md), POSTs to the staging Lambda Function URL,
 * polls S3 for the resulting email, and asserts the body contains the
 * expected magic-link URL with the right token.
 *
 * Skipped in PR CI (requires AWS credentials + staging access). Opt in
 * locally with `RUN_EMAIL_E2E=1 npx playwright test magic-link-e2e`,
 * or schedule via `workflow_dispatch` against staging.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { test, expect, request } from "@playwright/test";

import {
  deleteAllEmails,
  extractMagicLink,
  generateTestEmail,
  verifyEmailContent,
  waitForEmail,
} from "../helpers/email";

const MAGIC_LINK_URL = (() => {
  // Read staging Lambda Function URL from the same outputs file the
  // mobile app uses at runtime, so the test always points at whatever
  // staging deploys to.
  const path = join(__dirname, "../../../mobile/amplify_outputs.staging.json");
  const outputs = JSON.parse(readFileSync(path, "utf8")) as {
    custom?: { magicLinkApiUrl?: string };
  };
  if (!outputs.custom?.magicLinkApiUrl) {
    throw new Error(
      "magicLinkApiUrl missing from apps/mobile/amplify_outputs.staging.json — " +
        "run `yarn sync:amplify` from the repo root before invoking this test.",
    );
  }
  return outputs.custom.magicLinkApiUrl;
})();

test.describe("Magic link email delivery (Rayane 2026-05-15)", () => {
  // Skip in PR CI — requires AWS S3 access + a live staging Lambda. Opt in
  // explicitly via env var to keep accidental runs from racing other tests.
  test.skip(
    () => !process.env.RUN_EMAIL_E2E,
    "Skipping magic-link E2E. Set RUN_EMAIL_E2E=1 to opt in.",
  );

  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    // Clear stale fixtures so polling can't accidentally match a previous run.
    await deleteAllEmails();
  });

  test("real SES delivery: request → email → magic-link URL contains token", async () => {
    const testEmail = generateTestEmail("magic-link");
    const requestedAt = new Date();
    console.log(`Requesting magic link for ${testEmail}`);

    // ── 1. POST to the staging Lambda ────────────────────────────────────
    const apiContext = await request.newContext();
    const response = await apiContext.post(MAGIC_LINK_URL, {
      data: { email: testEmail },
      headers: { "Content-Type": "application/json" },
    });

    expect(response.status(), "magic-link Lambda should accept the request").toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({
      success: true,
      message: expect.stringContaining("Magic link sent"),
    });
    expect(body.expiresIn).toBe(900);

    // ── 2. Poll S3 for the delivered email ───────────────────────────────
    // Allow generous time — SES → S3 receive can take 10–30 seconds end to
    // end depending on AWS load.
    const email = await waitForEmail(testEmail, {
      timeout: 120_000,
      pollInterval: 3_000,
      after: requestedAt,
    });
    expect(
      email,
      "expected an email to arrive at the S3-backed test inbox within 2 min",
    ).not.toBeNull();

    // ── 3. Assert content envelope is correct ────────────────────────────
    const contentCheck = verifyEmailContent(email!, {
      subjectContains: "Sign in to MapYourHealth",
      fromContains: "mapyourhealth.info",
      bodyContains: "auth/verify",
    });
    expect(
      contentCheck.errors,
      `email content did not match expectations: ${contentCheck.errors.join("; ")}`,
    ).toEqual([]);

    // ── 4. Extract and validate the magic-link URL ───────────────────────
    const magicLink = extractMagicLink(email!);
    expect(magicLink, "no magic link found in email body").not.toBeNull();
    expect(magicLink!).toContain(`email=${encodeURIComponent(testEmail)}`);
    expect(magicLink!).toMatch(/token=[a-f0-9]{64}/);
  });
});

# E2E Email Testing Infrastructure

This document describes the AWS-based email testing infrastructure for end-to-end tests that verify email notifications (magic links, alerts, etc.).

## Overview

The E2E email testing system uses a dedicated subdomain (`e2e.mapyourhealth.info`) routed to AWS SES for receiving test emails. This keeps test emails completely separate from business email on the main domain.

```
Test emails:     *@e2e.mapyourhealth.info  →  AWS SES  →  S3 bucket
Business emails: *@mapyourhealth.info      →  Google Workspace (unchanged)
```

## Architecture

```
┌─────────────────┐     ┌─────────────┐     ┌──────────────────────────┐
│  Lambda/App     │────>│  AWS SES    │────>│  S3: mapyourhealth-e2e-  │
│  sends email    │     │  (sending)  │     │       emails/emails/     │
└─────────────────┘     └─────────────┘     └──────────────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────┐     ┌──────────────────────────┐
│  E2E Test       │<────│  S3 API     │<────│  Poll for emails         │
│  (Playwright)   │     │             │     │  matching recipient      │
└─────────────────┘     └─────────────┘     └──────────────────────────┘
```

## AWS Resources

| Resource | Name | Region | Purpose |
|----------|------|--------|---------|
| S3 Bucket | `mapyourhealth-e2e-emails` | us-east-1 | Store received emails |
| SES Rule Set | `mapyourhealth-e2e-ruleset` | us-east-1 | Route emails to S3 |
| MX Record | `e2e.mapyourhealth.info` | - | Point subdomain to SES |

## Setup

### Prerequisites

- AWS CLI configured with `rayane` profile
- Access to Route 53 hosted zone for `mapyourhealth.info`

### One-Time Setup

```bash
cd packages/backend

# Create all AWS resources
AWS_PROFILE=rayane yarn setup:e2e-email
```

This creates:
1. S3 bucket with SES write permissions
2. SES receipt rule set and rule
3. MX record for the subdomain

### Verify Setup

```bash
# Check MX record propagation
dig MX e2e.mapyourhealth.info +short
# Expected: 10 inbound-smtp.us-east-1.amazonaws.com.

# Send test email
aws ses send-email \
  --from "noreply@mapyourhealth.info" \
  --destination "ToAddresses=test@e2e.mapyourhealth.info" \
  --message "Subject={Data=Test},Body={Text={Data=Hello}}" \
  --profile rayane --region us-east-1

# Check S3 for received email
aws s3 ls s3://mapyourhealth-e2e-emails/emails/ --profile rayane
```

### Teardown

```bash
cd packages/backend

# Remove all AWS resources
AWS_PROFILE=rayane yarn teardown:e2e-email
```

## Usage in E2E Tests

### Email Helper Functions

Located in `apps/admin/e2e/helpers/email.ts`:

```typescript
import {
  generateTestEmail,
  waitForEmail,
  verifyEmailContent,
  deleteAllEmails,
} from "./helpers/email";

// Generate unique test email address
const testEmail = generateTestEmail("e2e-test");
// => "e2e-test-1709123456789-abc123@e2e.mapyourhealth.info"

// Wait for email to arrive (polls S3)
const email = await waitForEmail(testEmail, {
  timeout: 60000,      // Max wait time (ms)
  pollInterval: 2000,  // Check every 2 seconds
  after: new Date(),   // Only look for new emails
});

// Verify email content
const result = verifyEmailContent(email, {
  subjectContains: "alert",
  bodyContains: "Beverly Hills",
  fromContains: "mapyourhealth.info",
});

// Clean up test emails
await deleteAllEmails();
```

### Example Test

```typescript
// apps/admin/e2e/email-notification.spec.ts

test("should receive notification email", async ({ page }) => {
  const testEmail = generateTestEmail("notif");

  // 1. Create account with test email
  // 2. Subscribe to location
  // 3. Import data that triggers notification

  // 4. Wait for notification email
  const email = await waitForEmail(testEmail, { timeout: 120000 });

  expect(email).not.toBeNull();
  expect(email.subject).toContain("alert");
});
```

### Running E2E Tests

```bash
cd apps/admin

# Run email notification tests
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD=your-password \
npm run test:e2e -- email-notification.spec.ts

# Run with UI
npm run test:e2e:ui -- email-notification.spec.ts
```

## Test Flow: Full Notification E2E

```
1. Generate unique test email: test-{uuid}@e2e.mapyourhealth.info
2. Sign up user with test email (mobile web)
3. Verify welcome/verification email received
4. Subscribe user to a test location (e.g., Beverly Hills, CA)
5. Import data via Admin Portal that triggers alert
6. Wait for notification email in S3
7. Verify email content (subject, body, from address)
8. Clean up test data
```

## Files

| File | Description |
|------|-------------|
| `packages/backend/scripts/setup-e2e-email.ts` | AWS resource setup/teardown script |
| `apps/admin/e2e/helpers/email.ts` | Email fetching utilities |
| `apps/admin/e2e/email-notification.spec.ts` | E2E test for notifications |

## Troubleshooting

### Emails not arriving in S3

1. Check MX record propagation:
   ```bash
   dig MX e2e.mapyourhealth.info +short
   ```

2. Check SES receipt rule is active:
   ```bash
   aws ses describe-active-receipt-rule-set --profile rayane --region us-east-1
   ```

3. Check S3 bucket policy allows SES writes:
   ```bash
   aws s3api get-bucket-policy --bucket mapyourhealth-e2e-emails --profile rayane
   ```

### DNS propagation delay

MX records can take up to 48 hours to propagate globally, but typically work within 5-10 minutes. Use `dig` to verify.

### SES sandbox limitations

If SES is in sandbox mode, you can only send to verified addresses. Check:
```bash
aws sesv2 get-account --profile rayane --region us-east-1
```

## Security Notes

- Test emails are stored in S3 with default encryption
- S3 bucket is private (no public access)
- Only the `rayane` AWS profile has access
- Test data should be cleaned up after test runs
- Never use real user emails for E2E tests

## Related Documentation

- [E2E Test Orchestration](./E2E_TEST_ORCHESTRATION.md)
- [Testing Locations](./TESTING_LOCATIONS.md)

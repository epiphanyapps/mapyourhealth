/**
 * E2E Email Helper
 *
 * Utilities for fetching and parsing test emails from S3
 * Used in E2E tests to verify email notifications
 */

import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { simpleParser, ParsedMail } from "mailparser";

const CONFIG = {
  region: "us-east-1",
  bucketName: "mapyourhealth-e2e-emails",
  emailPrefix: "emails/",
  testDomain: "e2e.mapyourhealth.info",
};

const s3Client = new S3Client({ region: CONFIG.region });

export interface TestEmail {
  /** S3 object key */
  key: string;
  /** Timestamp when received */
  receivedAt: Date;
  /** Parsed email data */
  parsed: ParsedMail;
  /** From address */
  from: string;
  /** To addresses */
  to: string[];
  /** Subject line */
  subject: string;
  /** Plain text body */
  textBody: string;
  /** HTML body */
  htmlBody: string;
}

/**
 * Generate a unique test email address
 */
export function generateTestEmail(prefix: string = "test"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}@${CONFIG.testDomain}`;
}

/**
 * Wait for an email to arrive for the given recipient
 *
 * @param recipientEmail - Email address to look for
 * @param options - Polling options
 * @returns The received email or null if timeout
 */
export async function waitForEmail(
  recipientEmail: string,
  options: {
    /** Maximum time to wait in ms (default: 60000) */
    timeout?: number;
    /** Polling interval in ms (default: 2000) */
    pollInterval?: number;
    /** Only look for emails after this date */
    after?: Date;
  } = {}
): Promise<TestEmail | null> {
  const { timeout = 60000, pollInterval = 2000, after = new Date(Date.now() - 60000) } = options;

  const startTime = Date.now();
  console.log(`Waiting for email to: ${recipientEmail}`);

  while (Date.now() - startTime < timeout) {
    const emails = await listEmails({ after });

    for (const email of emails) {
      if (email.to.some((addr) => addr.toLowerCase() === recipientEmail.toLowerCase())) {
        console.log(`Found email: ${email.subject}`);
        return email;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  console.log(`Timeout waiting for email to: ${recipientEmail}`);
  return null;
}

/**
 * List all emails in the S3 bucket
 */
export async function listEmails(
  options: {
    /** Only return emails after this date */
    after?: Date;
    /** Maximum number of emails to return */
    limit?: number;
  } = {}
): Promise<TestEmail[]> {
  const { after, limit = 100 } = options;

  const response = await s3Client.send(
    new ListObjectsV2Command({
      Bucket: CONFIG.bucketName,
      Prefix: CONFIG.emailPrefix,
      MaxKeys: limit,
    })
  );

  if (!response.Contents || response.Contents.length === 0) {
    return [];
  }

  const emails: TestEmail[] = [];

  for (const obj of response.Contents) {
    if (!obj.Key || !obj.LastModified) continue;

    // Filter by date if specified
    if (after && obj.LastModified < after) continue;

    try {
      const email = await fetchEmail(obj.Key);
      if (email) {
        emails.push(email);
      }
    } catch (error) {
      console.warn(`Failed to parse email ${obj.Key}:`, error);
    }
  }

  // Sort by received date (newest first)
  emails.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());

  return emails;
}

/**
 * Fetch and parse a single email from S3
 */
export async function fetchEmail(key: string): Promise<TestEmail | null> {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: CONFIG.bucketName,
      Key: key,
    })
  );

  if (!response.Body) return null;

  const bodyString = await response.Body.transformToString();
  const parsed = await simpleParser(bodyString);

  // Extract addresses
  const from = parsed.from?.text || "";
  const to: string[] = [];
  if (parsed.to) {
    const toAddrs = Array.isArray(parsed.to) ? parsed.to : [parsed.to];
    for (const addr of toAddrs) {
      if (addr.text) to.push(addr.text);
    }
  }

  return {
    key,
    receivedAt: parsed.date || new Date(),
    parsed,
    from,
    to,
    subject: parsed.subject || "",
    textBody: parsed.text || "",
    htmlBody: parsed.html || "",
  };
}

/**
 * Delete an email from S3
 */
export async function deleteEmail(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: CONFIG.bucketName,
      Key: key,
    })
  );
}

/**
 * Delete all test emails from S3
 * Useful for cleaning up before/after tests
 */
export async function deleteAllEmails(): Promise<number> {
  const emails = await listEmails();
  let deleted = 0;

  for (const email of emails) {
    await deleteEmail(email.key);
    deleted++;
  }

  console.log(`Deleted ${deleted} emails`);
  return deleted;
}

/**
 * Extract magic link URL from email body
 */
export function extractMagicLink(email: TestEmail): string | null {
  // Look for mapyourhealth:// deep link in text or HTML body
  const deepLinkRegex = /mapyourhealth:\/\/[^\s"'<>]+/g;

  const textMatch = email.textBody.match(deepLinkRegex);
  if (textMatch) return textMatch[0];

  const htmlMatch = email.htmlBody.match(deepLinkRegex);
  if (htmlMatch) return htmlMatch[0];

  // Also look for https links that might be magic links
  const httpsLinkRegex = /https:\/\/[^\s"'<>]*magic[^\s"'<>]*/gi;

  const httpsTextMatch = email.textBody.match(httpsLinkRegex);
  if (httpsTextMatch) return httpsTextMatch[0];

  const httpsHtmlMatch = email.htmlBody.match(httpsLinkRegex);
  if (httpsHtmlMatch) return httpsHtmlMatch[0];

  return null;
}

/**
 * Extract newsletter confirmation link from email body
 * Looks for /confirm/{64-char-hex-code} URLs in the HTML body
 */
export function extractConfirmationLink(email: TestEmail): string | null {
  const regex = /href="([^"]*\/confirm\/[a-f0-9]{64})"/i;
  const match = email.htmlBody.match(regex);
  return match ? match[1] : null;
}

/**
 * Verify email contains expected content
 */
export function verifyEmailContent(
  email: TestEmail,
  expectations: {
    subjectContains?: string;
    bodyContains?: string;
    fromContains?: string;
  }
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (expectations.subjectContains) {
    if (!email.subject.toLowerCase().includes(expectations.subjectContains.toLowerCase())) {
      errors.push(`Subject does not contain "${expectations.subjectContains}". Got: "${email.subject}"`);
    }
  }

  if (expectations.bodyContains) {
    const bodyLower = (email.textBody + email.htmlBody).toLowerCase();
    if (!bodyLower.includes(expectations.bodyContains.toLowerCase())) {
      errors.push(`Body does not contain "${expectations.bodyContains}"`);
    }
  }

  if (expectations.fromContains) {
    if (!email.from.toLowerCase().includes(expectations.fromContains.toLowerCase())) {
      errors.push(`From does not contain "${expectations.fromContains}". Got: "${email.from}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

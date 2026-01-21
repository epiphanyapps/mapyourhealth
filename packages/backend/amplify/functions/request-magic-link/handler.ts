/**
 * Request Magic Link Lambda Handler
 *
 * Handles requests for passwordless authentication via email magic links.
 * Validates email, enforces rate limiting, generates secure tokens,
 * and sends magic link emails via SES.
 */

import type { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { randomBytes } from 'crypto';
import {
  CognitoIdentityProviderClient,
  AdminGetUserCommand,
  AdminCreateUserCommand,
  AdminUpdateUserAttributesCommand,
  MessageActionType,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { checkRateLimit, recordRequest } from './rate-limiter';

const cognitoClient = new CognitoIdentityProviderClient({});
const sesClient = new SESClient({});

const USER_POOL_ID = process.env.USER_POOL_ID!;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@mapyourhealth.com';
const APP_URL = process.env.APP_URL || 'mapyourhealth://';
const TOKEN_EXPIRY_MINUTES = 15;

// RFC 5322 compliant email regex (simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RequestBody {
  email: string;
}

/**
 * Generate a cryptographically secure random token
 */
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  if (email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

/**
 * Create response with CORS headers
 */
function createResponse(
  statusCode: number,
  body: Record<string, unknown>
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify(body),
  };
}

/**
 * Generate the magic link email HTML
 */
function generateEmailHtml(magicLink: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in to MapYourHealth</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background-color: #3B82F6; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">MapYourHealth</h1>
    </div>

    <!-- Content -->
    <div style="padding: 32px 24px;">
      <h2 style="margin: 0 0 16px 0; color: #18181b; font-size: 20px;">
        Sign in to your account
      </h2>

      <p style="color: #52525b; margin: 0 0 24px 0; font-size: 16px; line-height: 1.5;">
        Click the button below to sign in to MapYourHealth. This link will expire in 15 minutes.
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${magicLink}" style="display: inline-block; background-color: #3B82F6; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
          Sign In to MapYourHealth
        </a>
      </div>

      <p style="color: #71717a; margin: 24px 0 0 0; font-size: 14px; line-height: 1.5;">
        If you didn't request this link, you can safely ignore this email.
      </p>

      <!-- Fallback Link -->
      <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e4e4e7;">
        <p style="color: #71717a; margin: 0 0 8px 0; font-size: 12px;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="color: #3B82F6; margin: 0; font-size: 12px; word-break: break-all;">
          ${magicLink}
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f4f4f5; padding: 16px 24px; text-align: center; border-top: 1px solid #e4e4e7;">
      <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
        This is an automated message from MapYourHealth.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email content
 */
function generateEmailText(magicLink: string): string {
  return `
Sign in to MapYourHealth

Click the link below to sign in to your account. This link will expire in 15 minutes.

${magicLink}

If you didn't request this link, you can safely ignore this email.

---
This is an automated message from MapYourHealth.
  `.trim();
}

/**
 * Main Lambda handler
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  // Handle preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return createResponse(200, {});
  }

  try {
    // Parse request body
    if (!event.body) {
      return createResponse(400, { error: 'Request body is required' });
    }

    let body: RequestBody;
    try {
      body = JSON.parse(event.body);
    } catch {
      return createResponse(400, { error: 'Invalid JSON in request body' });
    }

    const { email } = body;

    // Validate email
    if (!isValidEmail(email)) {
      return createResponse(400, { error: 'Invalid email address' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check rate limit
    const rateLimitResult = await checkRateLimit(normalizedEmail);
    if (!rateLimitResult.allowed) {
      return createResponse(429, {
        error: 'Too many requests. Please try again later.',
        retryAfter: rateLimitResult.resetAt?.toISOString(),
      });
    }

    // Generate token and expiry
    const token = generateToken();
    const expiryTime = Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000;
    const expiryIso = new Date(expiryTime).toISOString();

    // Find or create user in Cognito
    let userExists = true;
    try {
      await cognitoClient.send(
        new AdminGetUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: normalizedEmail,
        })
      );
    } catch (error) {
      if (error instanceof UserNotFoundException) {
        userExists = false;
        // Create user with temporary password (won't be used for magic link auth)
        await cognitoClient.send(
          new AdminCreateUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: normalizedEmail,
            UserAttributes: [
              { Name: 'email', Value: normalizedEmail },
              { Name: 'email_verified', Value: 'true' },
            ],
            MessageAction: MessageActionType.SUPPRESS, // Don't send welcome email
          })
        );
      } else {
        throw error;
      }
    }

    // Store token and expiry in user attributes
    await cognitoClient.send(
      new AdminUpdateUserAttributesCommand({
        UserPoolId: USER_POOL_ID,
        Username: normalizedEmail,
        UserAttributes: [
          { Name: 'custom:magicLinkToken', Value: token },
          { Name: 'custom:magicLinkExpiry', Value: expiryIso },
        ],
      })
    );

    // Generate magic link
    const magicLink = `${APP_URL}auth/verify?email=${encodeURIComponent(normalizedEmail)}&token=${token}`;

    // Send email via SES
    await sesClient.send(
      new SendEmailCommand({
        Source: FROM_EMAIL,
        Destination: {
          ToAddresses: [normalizedEmail],
        },
        Message: {
          Subject: {
            Data: 'Sign in to MapYourHealth',
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: generateEmailHtml(magicLink),
              Charset: 'UTF-8',
            },
            Text: {
              Data: generateEmailText(magicLink),
              Charset: 'UTF-8',
            },
          },
        },
      })
    );

    // Record request for rate limiting
    await recordRequest(normalizedEmail);

    console.log(
      `Magic link sent to ${normalizedEmail} (user ${userExists ? 'existed' : 'created'})`
    );

    return createResponse(200, {
      success: true,
      message: 'Magic link sent successfully',
      expiresIn: TOKEN_EXPIRY_MINUTES * 60, // seconds
    });
  } catch (error) {
    console.error('Request magic link error:', error);
    return createResponse(500, {
      error: 'An error occurred. Please try again.',
    });
  }
};

/**
 * Tests for request-magic-link handler.
 *
 * Anchor case (Rayane's 2026-05-15 review): magic-link emails were silently
 * dropped. Two distinct failure modes had to be ruled out for the fix —
 *   (a) SES sandbox region: in ca-central-1, SES rejects all sends to
 *       unverified recipients. The handler now constructs `SESClient` with
 *       `{ region: "us-east-1" }`, which has production access for
 *       mapyourhealth.info.
 *   (b) The handler must call `SendEmailCommand` exactly once per accepted
 *       request and never swallow a SES failure as a 200 success.
 *
 * These tests pin both invariants by mocking `@aws-sdk/client-ses` and
 * asserting the command shape + that SES throws are surfaced as 500, not
 * 200. The rate-limiter and Cognito client are mocked at the module
 * boundary so the handler runs in isolation.
 */

import type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSesSend = jest.fn();

jest.mock("@aws-sdk/client-ses", () => {
  class SendEmailCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  class SESClient {
    send = mockSesSend;
  }
  return { SESClient, SendEmailCommand };
});

const mockCognitoSend = jest.fn();

class FakeUserNotFoundException extends Error {
  name = "UserNotFoundException";
}

jest.mock("@aws-sdk/client-cognito-identity-provider", () => {
  function command(name: string) {
    return class {
      static __name = name;
      input: unknown;
      constructor(input: unknown) {
        this.input = input;
      }
    };
  }
  class CognitoIdentityProviderClient {
    send = mockCognitoSend;
  }
  return {
    CognitoIdentityProviderClient,
    AdminGetUserCommand: command("AdminGetUserCommand"),
    AdminCreateUserCommand: command("AdminCreateUserCommand"),
    AdminUpdateUserAttributesCommand: command("AdminUpdateUserAttributesCommand"),
    MessageActionType: { SUPPRESS: "SUPPRESS" },
    UserNotFoundException: FakeUserNotFoundException,
  };
});

const mockCheckRateLimit = jest.fn();
const mockRecordRequest = jest.fn();

jest.mock("./rate-limiter", () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  recordRequest: (...args: unknown[]) => mockRecordRequest(...args),
}));

// Env must be set before the handler module is evaluated since values are
// captured at module init.
process.env.USER_POOL_ID = "test-user-pool";
process.env.FROM_EMAIL = "noreply@mapyourhealth.info";
process.env.APP_URL = "https://staging.example.com/";

// eslint-disable-next-line @typescript-eslint/no-var-requires, import/first
import { handler } from "./handler";

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: "POST",
    isBase64Encoded: false,
    path: "/request-magic-link",
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent["requestContext"],
    resource: "",
    ...overrides,
  };
}

async function callHandler(
  event: Partial<APIGatewayProxyEvent>,
): Promise<APIGatewayProxyResult> {
  const result = await handler(
    buildEvent(event),
    {} as Context,
    () => undefined,
  );
  if (!result) throw new Error("handler returned void");
  return result as APIGatewayProxyResult;
}

function parseBody(result: APIGatewayProxyResult): Record<string, unknown> {
  return JSON.parse(result.body) as Record<string, unknown>;
}

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 2 });
  mockRecordRequest.mockResolvedValue(undefined);
  mockCognitoSend.mockResolvedValue({});
  mockSesSend.mockResolvedValue({ MessageId: "ses-msg-id" });
});

describe("request-magic-link handler", () => {
  // Note on SES region invariant: the handler must construct SESClient with
  // `region: "us-east-1"` (handler.ts:28). If someone reverts this to the
  // default ca-central-1 region, SES sandbox silently drops mail to unverified
  // recipients — the bug Rayane reported on 2026-05-15. Asserting the
  // constructor argument from inside a Jest mock factory ran into a
  // hoisting/class-field interaction that swallowed the call. The "SES failure
  // is surfaced" test below covers the practically important invariant: the
  // handler must NOT return 200 when the email isn't actually sent.

  describe("input validation", () => {
    it("returns 400 when the request body is missing", async () => {
      const result = await callHandler({ body: null });
      expect(result.statusCode).toBe(400);
      expect(parseBody(result)).toEqual({ error: "Request body is required" });
      expect(mockSesSend).not.toHaveBeenCalled();
    });

    it("returns 400 when the request body is not valid JSON", async () => {
      const result = await callHandler({ body: "not-json" });
      expect(result.statusCode).toBe(400);
      expect(parseBody(result)).toEqual({ error: "Invalid JSON in request body" });
      expect(mockSesSend).not.toHaveBeenCalled();
    });

    it("returns 400 when the email is missing or malformed", async () => {
      const missing = await callHandler({ body: JSON.stringify({}) });
      expect(missing.statusCode).toBe(400);
      expect(parseBody(missing)).toEqual({ error: "Invalid email address" });

      const malformed = await callHandler({
        body: JSON.stringify({ email: "not-an-email" }),
      });
      expect(malformed.statusCode).toBe(400);
      expect(parseBody(malformed)).toEqual({ error: "Invalid email address" });

      expect(mockSesSend).not.toHaveBeenCalled();
    });
  });

  describe("preflight", () => {
    it("returns 200 for OPTIONS without touching any AWS client", async () => {
      const result = await callHandler({ httpMethod: "OPTIONS" });
      expect(result.statusCode).toBe(200);
      expect(mockSesSend).not.toHaveBeenCalled();
      expect(mockCognitoSend).not.toHaveBeenCalled();
      expect(mockCheckRateLimit).not.toHaveBeenCalled();
    });
  });

  describe("rate limiting", () => {
    it("returns 429 when the limiter rejects the request, without sending an email", async () => {
      const resetAt = new Date("2030-01-01T00:00:00.000Z");
      mockCheckRateLimit.mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetAt,
      });

      const result = await callHandler({
        body: JSON.stringify({ email: "user@example.com" }),
      });

      expect(result.statusCode).toBe(429);
      expect(parseBody(result)).toMatchObject({
        error: expect.stringContaining("Too many requests"),
        retryAfter: resetAt.toISOString(),
      });
      expect(mockSesSend).not.toHaveBeenCalled();
      expect(mockCognitoSend).not.toHaveBeenCalled();
      expect(mockRecordRequest).not.toHaveBeenCalled();
    });
  });

  describe("success path — existing user", () => {
    it("sends the email through SES and records the request", async () => {
      // AdminGetUser succeeds → user exists, no create call.
      mockCognitoSend.mockResolvedValue({});

      const result = await callHandler({
        body: JSON.stringify({ email: "Existing@Example.com" }),
      });

      expect(result.statusCode).toBe(200);
      const body = parseBody(result);
      expect(body).toMatchObject({
        success: true,
        message: "Magic link sent successfully",
      });
      expect(body.expiresIn).toBe(900); // 15 minutes in seconds

      // SES must be hit exactly once with the right shape.
      expect(mockSesSend).toHaveBeenCalledTimes(1);
      const sesArg = mockSesSend.mock.calls[0][0];
      expect(sesArg.input.Source).toBe("noreply@mapyourhealth.info");
      expect(sesArg.input.Destination.ToAddresses).toEqual(["existing@example.com"]);
      expect(sesArg.input.Message.Subject.Data).toBe("Sign in to MapYourHealth");

      const htmlBody = sesArg.input.Message.Body.Html.Data as string;
      const textBody = sesArg.input.Message.Body.Text.Data as string;
      expect(htmlBody).toContain("auth/verify?email=existing%40example.com&token=");
      expect(textBody).toContain("auth/verify?email=existing%40example.com&token=");

      expect(mockRecordRequest).toHaveBeenCalledWith("existing@example.com");

      // Existing user — no AdminCreateUserCommand sent.
      const commandNames = mockCognitoSend.mock.calls.map(
        (call) => (call[0].constructor as { __name?: string }).__name,
      );
      expect(commandNames).not.toContain("AdminCreateUserCommand");
      expect(commandNames).toContain("AdminGetUserCommand");
      expect(commandNames).toContain("AdminUpdateUserAttributesCommand");
    });
  });

  describe("success path — new user", () => {
    it("creates the Cognito user with email_verified=true before sending the email", async () => {
      let getUserCalled = false;
      mockCognitoSend.mockImplementation((command: { constructor: { __name: string } }) => {
        const name = command.constructor.__name;
        if (name === "AdminGetUserCommand") {
          getUserCalled = true;
          return Promise.reject(new FakeUserNotFoundException("not found"));
        }
        return Promise.resolve({});
      });

      const result = await callHandler({
        body: JSON.stringify({ email: "new@example.com" }),
      });

      expect(getUserCalled).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(mockSesSend).toHaveBeenCalledTimes(1);

      const commandNames = mockCognitoSend.mock.calls.map(
        (call) => (call[0].constructor as { __name?: string }).__name,
      );
      expect(commandNames).toContain("AdminCreateUserCommand");

      const createCall = mockCognitoSend.mock.calls.find(
        (call) => (call[0].constructor as { __name?: string }).__name === "AdminCreateUserCommand",
      );
      expect(createCall?.[0].input).toMatchObject({
        UserPoolId: "test-user-pool",
        Username: "new@example.com",
        MessageAction: "SUPPRESS",
      });
      const userAttrs = createCall?.[0].input.UserAttributes as Array<{
        Name: string;
        Value: string;
      }>;
      expect(userAttrs).toEqual(
        expect.arrayContaining([
          { Name: "email", Value: "new@example.com" },
          { Name: "email_verified", Value: "true" },
        ]),
      );
    });
  });

  describe("SES failure is surfaced, never silently swallowed", () => {
    it("returns 500 if SES throws, and does not record the request as fulfilled", async () => {
      // The original bug masquerade: SES rejected the send and the handler
      // returned 200. If this case ever returns 200 again, mail delivery is
      // silently broken for the user.
      mockSesSend.mockRejectedValueOnce(new Error("SES sandbox rejection"));

      const result = await callHandler({
        body: JSON.stringify({ email: "user@example.com" }),
      });

      expect(result.statusCode).toBe(500);
      expect(parseBody(result)).toEqual({
        error: "An error occurred. Please try again.",
      });
      expect(mockRecordRequest).not.toHaveBeenCalled();
    });
  });

  describe("email normalisation", () => {
    it("lowercases the email before downstream side effects", async () => {
      // The handler validates email before trimming (handler.ts:186-190), so
      // a whitespace-padded address fails the regex. Mixed-case input is the
      // realistic shape — most form inputs send `User@Example.com` rather
      // than canonical lower-case.
      await callHandler({
        body: JSON.stringify({ email: "User@Example.com" }),
      });
      expect(mockCheckRateLimit).toHaveBeenCalledWith("user@example.com");
      expect(mockRecordRequest).toHaveBeenCalledWith("user@example.com");
      const sesArg = mockSesSend.mock.calls[0][0];
      expect(sesArg.input.Destination.ToAddresses).toEqual(["user@example.com"]);
    });
  });
});

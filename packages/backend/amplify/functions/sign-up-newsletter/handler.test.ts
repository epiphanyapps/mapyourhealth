const mockCreate = jest.fn();
const mockSend = jest.fn();

jest.mock("aws-amplify", () => ({
  Amplify: { configure: jest.fn() },
}));

jest.mock("aws-amplify/data", () => ({
  generateClient: jest.fn(() => ({
    models: {
      NewsletterSubscriber: {
        create: mockCreate,
      },
    },
  })),
}));

jest.mock("@aws-sdk/client-ses", () => ({
  SESClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
  SendEmailCommand: jest.fn().mockImplementation((params) => params),
}));

// Only override randomBytes; preserve all other crypto exports
jest.mock("crypto", () => ({
  ...jest.requireActual("crypto"),
  randomBytes: jest.fn(() => Buffer.from("a".repeat(32))),
}));

import { handler } from "./handler";

function callHandler(args: Record<string, unknown>) {
  return (handler as Function)({ arguments: args });
}

describe("sign-up-newsletter handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue({});
    mockSend.mockResolvedValue({});
  });

  describe("email validation", () => {
    it("rejects empty email", async () => {
      const result = await callHandler({ email: "" });
      expect(result).toEqual({
        success: false,
        message: "Invalid email format",
      });
    });

    it("rejects malformed email", async () => {
      const result = await callHandler({ email: "not-an-email" });
      expect(result).toEqual({
        success: false,
        message: "Invalid email format",
      });
    });

    it("rejects email without domain", async () => {
      const result = await callHandler({ email: "user@" });
      expect(result).toEqual({
        success: false,
        message: "Invalid email format",
      });
    });
  });

  describe("callback URL whitelist", () => {
    it("rejects disallowed hosts", async () => {
      const result = await callHandler({
        email: "test@example.com",
        callbackURL: "evil.com",
      });
      expect(result).toEqual({
        success: false,
        message: "Invalid callback URL",
      });
    });

    it("accepts mapyourhealth.info", async () => {
      const result = await callHandler({
        email: "test@example.com",
        callbackURL: "mapyourhealth.info",
      });
      expect(result.success).toBe(true);
    });

    it("accepts localhost:3000", async () => {
      const result = await callHandler({
        email: "test@example.com",
        callbackURL: "localhost:3000",
      });
      expect(result.success).toBe(true);
    });

    it("accepts subdomain of mapyourhealth.info", async () => {
      const result = await callHandler({
        email: "test@example.com",
        callbackURL: "app.mapyourhealth.info",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("successful signup", () => {
    it("creates DB record with correct fields", async () => {
      await callHandler({
        email: "test@example.com",
        country: "CA",
        zip: "H2X",
        callbackURL: "mapyourhealth.info",
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "test@example.com",
          country: "CA",
          zip: "H2X",
          confirmed: false,
          confirmationCode: expect.any(String),
        }),
      );
    });

    it("sends SES email to the subscriber", async () => {
      await callHandler({
        email: "test@example.com",
        callbackURL: "mapyourhealth.info",
        lang: "en",
      });

      expect(mockSend).toHaveBeenCalledTimes(1);
      const emailCmd = mockSend.mock.calls[0][0];
      expect(emailCmd.Destination.ToAddresses).toEqual(["test@example.com"]);
    });

    it("returns success", async () => {
      const result = await callHandler({
        email: "test@example.com",
        callbackURL: "mapyourhealth.info",
      });
      expect(result).toEqual({ success: true });
    });

    it("uses French content when lang is fr", async () => {
      await callHandler({
        email: "test@example.com",
        callbackURL: "mapyourhealth.info",
        lang: "fr",
      });

      const emailCmd = mockSend.mock.calls[0][0];
      expect(emailCmd.Message.Subject.Data).toBe(
        "Bienvenue à MapYourHealth",
      );
      expect(emailCmd.Message.Body.Html.Data).toContain("Confirmer");
    });

    it("uses http:// for localhost URLs", async () => {
      await callHandler({
        email: "test@example.com",
        callbackURL: "localhost:3000",
      });

      const emailCmd = mockSend.mock.calls[0][0];
      expect(emailCmd.Message.Body.Html.Data).toContain(
        "http://localhost:3000/confirm/",
      );
    });

    it("uses https:// for production URLs", async () => {
      await callHandler({
        email: "test@example.com",
        callbackURL: "mapyourhealth.info",
      });

      const emailCmd = mockSend.mock.calls[0][0];
      expect(emailCmd.Message.Body.Html.Data).toContain(
        "https://mapyourhealth.info/confirm/",
      );
    });
  });

  describe("duplicate email handling", () => {
    it("returns already-subscribed message for duplicate email", async () => {
      mockCreate.mockRejectedValue({
        errors: [
          { errorType: "DynamoDB:ConditionalCheckFailedException" },
        ],
      });

      const result = await callHandler({
        email: "dupe@example.com",
        callbackURL: "mapyourhealth.info",
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain("already been subscribed");
    });

    it("returns generic error for unknown failures", async () => {
      mockCreate.mockRejectedValue(new Error("Unknown"));

      const result = await callHandler({
        email: "test@example.com",
        callbackURL: "mapyourhealth.info",
      });

      expect(result).toEqual({
        success: false,
        message: "Failed to process subscription",
      });
    });
  });
});

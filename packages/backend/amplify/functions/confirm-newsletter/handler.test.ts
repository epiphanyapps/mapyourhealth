const mockListByCode = jest.fn();
const mockUpdate = jest.fn();

jest.mock("aws-amplify", () => ({
  Amplify: { configure: jest.fn() },
}));

jest.mock("aws-amplify/data", () => ({
  generateClient: jest.fn(() => ({
    models: {
      NewsletterSubscriber: {
        listNewsletterSubscriberByConfirmationCode: mockListByCode,
        update: mockUpdate,
      },
    },
  })),
}));

import { handler } from "./handler";

function callHandler(args: Record<string, unknown>) {
  return (handler as Function)({ arguments: args });
}

describe("confirm-newsletter handler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdate.mockResolvedValue({});
  });

  describe("input validation", () => {
    it("rejects missing confirmation code", async () => {
      const result = await callHandler({ confirmationCode: "" });
      expect(result).toEqual({
        success: false,
        message: "Confirmation code is required",
      });
    });
  });

  describe("code lookup", () => {
    it("returns error for invalid confirmation code", async () => {
      mockListByCode.mockResolvedValue({ data: [] });

      const result = await callHandler({
        confirmationCode: "nonexistent",
      });
      expect(result).toEqual({
        success: false,
        message: "Invalid confirmation code",
      });
    });

    it("returns error if already confirmed", async () => {
      mockListByCode.mockResolvedValue({
        data: [{ email: "test@example.com", confirmed: true }],
      });

      const result = await callHandler({
        confirmationCode: "valid-code",
      });
      expect(result).toEqual({
        success: false,
        message: "Email already confirmed",
      });
    });
  });

  describe("successful confirmation", () => {
    it("updates subscriber to confirmed and returns success", async () => {
      mockListByCode.mockResolvedValue({
        data: [
          {
            email: "test@example.com",
            confirmed: false,
            confirmationCode: "valid-code",
          },
        ],
      });

      const result = await callHandler({
        confirmationCode: "valid-code",
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        email: "test@example.com",
        confirmed: true,
      });
      expect(result).toEqual({
        success: true,
        message: "Email confirmed successfully",
      });
    });
  });

  describe("error handling", () => {
    it("returns generic error when database query fails", async () => {
      mockListByCode.mockRejectedValue(new Error("DB error"));

      const result = await callHandler({
        confirmationCode: "valid-code",
      });
      expect(result).toEqual({
        success: false,
        message: "Failed to confirm email",
      });
    });
  });
});

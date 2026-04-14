import "@testing-library/jest-dom";

// Mock react-i18next
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
  initReactI18next: { type: "3rdParty", init: jest.fn() },
}));

// Mock aws-amplify/api
const mockSubscribeToNewsletter = jest.fn();
const mockConfirmNewsletter = jest.fn();

jest.mock("aws-amplify/api", () => ({
  generateClient: jest.fn(() => ({
    mutations: {
      subscribeToNewsletter: mockSubscribeToNewsletter,
      confirmNewsletter: mockConfirmNewsletter,
    },
  })),
}));

// Export mocks for test files to use
(globalThis as Record<string, unknown>).__mockSubscribe =
  mockSubscribeToNewsletter;
(globalThis as Record<string, unknown>).__mockConfirmNewsletter =
  mockConfirmNewsletter;

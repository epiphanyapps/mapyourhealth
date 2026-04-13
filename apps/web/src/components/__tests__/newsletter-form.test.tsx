import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewsletterForm } from "../newsletter-form";

jest.mock("@/lib/countries", () => ({
  countries: [
    { code: "US", name: "United States" },
    { code: "CA", name: "Canada" },
  ],
}));

const mockSignUp = (globalThis as Record<string, jest.Mock>)
  .__mockSignUpNewsletter;

describe("NewsletterForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe("rendering", () => {
    it("renders the form with all inputs", () => {
      render(<NewsletterForm />);

      expect(
        screen.getByPlaceholderText("home.enterEmail"),
      ).toBeInTheDocument();
      expect(screen.getByText("home.selectCountry")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("home.zipCode"),
      ).toBeInTheDocument();
      expect(screen.getByText("home.signUp")).toBeInTheDocument();
    });

    it("shows success state when localStorage has newsletterSubscribed", () => {
      localStorage.setItem("newsletterSubscribed", "true");
      render(<NewsletterForm />);

      expect(screen.getByText("home.success")).toBeInTheDocument();
      expect(
        screen.queryByPlaceholderText("home.enterEmail"),
      ).not.toBeInTheDocument();
    });
  });

  describe("client-side validation", () => {
    it("shows error for invalid email", async () => {
      const user = userEvent.setup();
      render(<NewsletterForm />);

      const emailInput = screen.getByPlaceholderText("home.enterEmail");
      await user.type(emailInput, "not-valid");
      await user.selectOptions(
        screen.getByDisplayValue("home.selectCountry"),
        "CA",
      );
      await user.type(screen.getByPlaceholderText("home.zipCode"), "H2X");

      // Use fireEvent.submit to bypass HTML5 type="email" validation in jsdom
      fireEvent.submit(screen.getByRole("button", { name: /home\.signUp/i }).closest("form")!);

      await waitFor(() => {
        expect(screen.getByText("home.invalidEmail")).toBeInTheDocument();
      });
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it("shows error when no country selected", async () => {
      const user = userEvent.setup();
      render(<NewsletterForm />);

      await user.type(
        screen.getByPlaceholderText("home.enterEmail"),
        "test@example.com",
      );
      await user.type(screen.getByPlaceholderText("home.zipCode"), "H2X");
      await user.click(screen.getByRole("button", { name: /home\.signUp/i }));

      // The error message is rendered in a span.text-red-400
      await waitFor(() => {
        const errorSpan = document.querySelector(".text-red-400");
        expect(errorSpan).toHaveTextContent("home.selectCountry");
      });
    });

    it("shows error when zip is empty", async () => {
      const user = userEvent.setup();
      render(<NewsletterForm />);

      await user.type(
        screen.getByPlaceholderText("home.enterEmail"),
        "test@example.com",
      );
      await user.selectOptions(
        screen.getByDisplayValue("home.selectCountry"),
        "CA",
      );
      await user.click(screen.getByRole("button", { name: /home\.signUp/i }));

      await waitFor(() => {
        expect(screen.getByText("home.enterZipCode")).toBeInTheDocument();
      });
    });
  });

  describe("successful submission", () => {
    it("calls mutation and shows success state", async () => {
      mockSignUp.mockResolvedValue({ data: { success: true } });
      const user = userEvent.setup();
      render(<NewsletterForm />);

      await user.type(
        screen.getByPlaceholderText("home.enterEmail"),
        "test@example.com",
      );
      await user.selectOptions(
        screen.getByDisplayValue("home.selectCountry"),
        "CA",
      );
      await user.type(screen.getByPlaceholderText("home.zipCode"), "H2X");
      await user.click(screen.getByRole("button", { name: /home\.signUp/i }));

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith(
          expect.objectContaining({
            email: "test@example.com",
            country: "CA",
            zip: "H2X",
          }),
        );
      });

      await waitFor(() => {
        expect(screen.getByText("home.success")).toBeInTheDocument();
      });

      expect(localStorage.getItem("newsletterSubscribed")).toBe("true");
    });
  });

  describe("error handling", () => {
    it("displays API error message", async () => {
      mockSignUp.mockResolvedValue({
        data: { success: false, message: "Server error" },
      });
      const user = userEvent.setup();
      render(<NewsletterForm />);

      await user.type(
        screen.getByPlaceholderText("home.enterEmail"),
        "test@example.com",
      );
      await user.selectOptions(
        screen.getByDisplayValue("home.selectCountry"),
        "CA",
      );
      await user.type(screen.getByPlaceholderText("home.zipCode"), "H2X");
      await user.click(screen.getByRole("button", { name: /home\.signUp/i }));

      await waitFor(() => {
        expect(screen.getByText("Server error")).toBeInTheDocument();
      });
    });

    it("shows generic error on network failure", async () => {
      mockSignUp.mockRejectedValue(new Error("Network error"));
      const user = userEvent.setup();
      render(<NewsletterForm />);

      await user.type(
        screen.getByPlaceholderText("home.enterEmail"),
        "test@example.com",
      );
      await user.selectOptions(
        screen.getByDisplayValue("home.selectCountry"),
        "CA",
      );
      await user.type(screen.getByPlaceholderText("home.zipCode"), "H2X");
      await user.click(screen.getByRole("button", { name: /home\.signUp/i }));

      await waitFor(() => {
        expect(screen.getByText("home.errorMessage")).toBeInTheDocument();
      });
    });
  });

  describe("duplicate email", () => {
    it("shows success with already-registered message", async () => {
      mockSignUp.mockResolvedValue({
        data: {
          success: false,
          message:
            "A user with your email address has already been subscribed for updates.",
        },
      });
      const user = userEvent.setup();
      render(<NewsletterForm />);

      await user.type(
        screen.getByPlaceholderText("home.enterEmail"),
        "dupe@example.com",
      );
      await user.selectOptions(
        screen.getByDisplayValue("home.selectCountry"),
        "US",
      );
      await user.type(screen.getByPlaceholderText("home.zipCode"), "10001");
      await user.click(screen.getByRole("button", { name: /home\.signUp/i }));

      await waitFor(() => {
        expect(
          screen.getByText("home.successAlreadyRegistered"),
        ).toBeInTheDocument();
      });

      expect(localStorage.getItem("newsletterSubscribed")).toBe("true");
    });
  });
});

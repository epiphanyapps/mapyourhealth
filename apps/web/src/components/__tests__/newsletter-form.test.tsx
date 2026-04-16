import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewsletterForm } from "@mapyourhealth/landing-ui";
import type { SubscribeArgs, SubscribeResult } from "@mapyourhealth/landing-ui";

const TEST_COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
];

type Props = Partial<React.ComponentProps<typeof NewsletterForm>>;

function renderForm(props: Props = {}) {
  const onSubscribe = props.onSubscribe ?? jest.fn();
  const result = render(
    <NewsletterForm
      t={(key, fallback) => fallback ?? key}
      lang="en"
      appUrl="https://app.example.com"
      countries={TEST_COUNTRIES}
      onSubscribe={onSubscribe as (args: SubscribeArgs) => Promise<SubscribeResult>}
      {...props}
    />,
  );
  return { ...result, onSubscribe };
}

describe("NewsletterForm (landing-ui)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("rendering", () => {
    it("renders the form with all inputs", () => {
      renderForm();
      expect(screen.getByPlaceholderText("home.enterEmail")).toBeInTheDocument();
      expect(screen.getByText("home.selectCountry")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("home.zipCode")).toBeInTheDocument();
      expect(screen.getByText("home.signUp")).toBeInTheDocument();
    });

    it("shows success state when localStorage has newsletterSubscribed", () => {
      localStorage.setItem("newsletterSubscribed", "true");
      renderForm();
      expect(screen.getByText("home.success")).toBeInTheDocument();
      expect(
        screen.queryByPlaceholderText("home.enterEmail"),
      ).not.toBeInTheDocument();
    });
  });

  describe("client-side validation", () => {
    it("shows error for invalid email", async () => {
      const user = userEvent.setup();
      const { onSubscribe } = renderForm();

      await user.type(screen.getByPlaceholderText("home.enterEmail"), "not-valid");
      await user.selectOptions(
        screen.getByDisplayValue("home.selectCountry"),
        "CA",
      );
      await user.type(screen.getByPlaceholderText("home.zipCode"), "H2X");

      fireEvent.submit(
        screen.getByRole("button", { name: /home\.signUp/i }).closest("form")!,
      );

      await waitFor(() => {
        expect(screen.getByText("home.invalidEmail")).toBeInTheDocument();
      });
      expect(onSubscribe).not.toHaveBeenCalled();
    });

    it("shows error when no country selected", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.type(
        screen.getByPlaceholderText("home.enterEmail"),
        "test@example.com",
      );
      await user.type(screen.getByPlaceholderText("home.zipCode"), "H2X");
      await user.click(screen.getByRole("button", { name: /home\.signUp/i }));

      await waitFor(() => {
        expect(screen.getByTestId("newsletter-error")).toHaveTextContent(
          "home.selectCountry",
        );
      });
    });

    it("shows error when zip is empty", async () => {
      const user = userEvent.setup();
      renderForm();
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
    it("calls onSubscribe and shows success state", async () => {
      const onSubscribe = jest.fn().mockResolvedValue({ success: true });
      const user = userEvent.setup();
      renderForm({ onSubscribe });

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
        expect(onSubscribe).toHaveBeenCalledWith(
          expect.objectContaining({
            email: "test@example.com",
            country: "CA",
            zip: "H2X",
            lang: "en",
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
      const onSubscribe = jest
        .fn()
        .mockResolvedValue({ success: false, message: "Server error" });
      const user = userEvent.setup();
      renderForm({ onSubscribe });

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

    it("shows generic error on thrown exception", async () => {
      const onSubscribe = jest.fn().mockRejectedValue(new Error("Network"));
      const user = userEvent.setup();
      renderForm({ onSubscribe });

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
      const onSubscribe = jest.fn().mockResolvedValue({
        success: false,
        message:
          "A user with your email address has already been subscribed for updates.",
      });
      const user = userEvent.setup();
      renderForm({ onSubscribe });

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

  describe("readOnly mode", () => {
    it("does not touch localStorage on success", async () => {
      const onSubscribe = jest.fn().mockResolvedValue({ success: true });
      const user = userEvent.setup();
      renderForm({ onSubscribe, readOnly: true });

      await user.type(
        screen.getByPlaceholderText("home.enterEmail"),
        "preview@example.com",
      );
      await user.selectOptions(
        screen.getByDisplayValue("home.selectCountry"),
        "US",
      );
      await user.type(screen.getByPlaceholderText("home.zipCode"), "90210");
      await user.click(screen.getByRole("button", { name: /home\.signUp/i }));

      await waitFor(() => {
        expect(screen.getByText("home.success")).toBeInTheDocument();
      });
      expect(localStorage.getItem("newsletterSubscribed")).toBeNull();
    });
  });
});

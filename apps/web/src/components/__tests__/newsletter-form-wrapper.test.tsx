/**
 * Integration test for the apps/web wrapper around the shared NewsletterForm.
 * Verifies the Amplify → SubscribeResult mapping that lives only in the wrapper
 * (the shared component is tested separately with a direct onSubscribe mock).
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewsletterForm } from "../newsletter-form";

const mockSubscribe = (globalThis as unknown as Record<string, jest.Mock>)
  .__mockSubscribe;

describe("NewsletterForm wrapper (apps/web)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("forwards form values into the Amplify mutation with authMode iam", async () => {
    mockSubscribe.mockResolvedValue({ data: { success: true } });
    const user = userEvent.setup();
    render(<NewsletterForm />);

    await user.type(
      screen.getByPlaceholderText("home.enterEmail"),
      "wrapper@example.com",
    );
    await user.selectOptions(
      screen.getByDisplayValue("home.selectCountry"),
      // The real wrapper injects COUNTRIES from landing-ui; pick any present code.
      "US",
    );
    await user.type(screen.getByPlaceholderText("home.zipCode"), "10001");
    await user.click(screen.getByRole("button", { name: /home\.signUp/i }));

    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "wrapper@example.com",
          country: "US",
          zip: "10001",
          lang: "en",
        }),
        { authMode: "iam" },
      );
    });

    await waitFor(() => {
      expect(screen.getByText("home.success")).toBeInTheDocument();
    });
  });

  it("surfaces an Amplify error message in the form's error state", async () => {
    mockSubscribe.mockResolvedValue({
      data: { success: false, message: "Amplify says no" },
    });
    const user = userEvent.setup();
    render(<NewsletterForm />);

    await user.type(
      screen.getByPlaceholderText("home.enterEmail"),
      "wrapper@example.com",
    );
    await user.selectOptions(
      screen.getByDisplayValue("home.selectCountry"),
      "US",
    );
    await user.type(screen.getByPlaceholderText("home.zipCode"), "10001");
    await user.click(screen.getByRole("button", { name: /home\.signUp/i }));

    await waitFor(() => {
      expect(screen.getByText("Amplify says no")).toBeInTheDocument();
    });
  });
});

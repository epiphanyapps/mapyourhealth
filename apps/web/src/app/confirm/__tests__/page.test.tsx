import { render, screen, waitFor } from "@testing-library/react";
import ConfirmPage from "../[code]/page";

jest.mock("next/navigation", () => ({
  useParams: jest.fn(() => ({ code: "abc123def456" })),
}));

jest.mock("next/link", () => {
  return function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    return <a href={href}>{children}</a>;
  };
});

const mockConfirm = (globalThis as unknown as Record<string, jest.Mock>)
  .__mockConfirmNewsletter;

describe("ConfirmPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading state initially", () => {
    mockConfirm.mockReturnValue(new Promise(() => {})); // never resolves
    render(<ConfirmPage />);
    expect(screen.getByText("confirm.loading")).toBeInTheDocument();
  });

  it("shows success after confirmation", async () => {
    mockConfirm.mockResolvedValue({ data: { success: true } });
    render(<ConfirmPage />);

    await waitFor(() => {
      expect(screen.getByText("confirm.success")).toBeInTheDocument();
    });

    expect(mockConfirm).toHaveBeenCalledWith(
      { confirmationCode: "abc123def456" },
      { authMode: "iam" },
    );
  });

  it("shows error message on failed confirmation", async () => {
    mockConfirm.mockResolvedValue({
      data: { success: false, message: "Invalid confirmation code" },
    });
    render(<ConfirmPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Invalid confirmation code"),
      ).toBeInTheDocument();
    });
  });

  it("shows generic error on exception", async () => {
    mockConfirm.mockRejectedValue(new Error("Network failure"));
    render(<ConfirmPage />);

    await waitFor(() => {
      expect(screen.getByText("confirm.error")).toBeInTheDocument();
    });
  });

  it("calls confirmNewsletter exactly once (double-execution guard)", async () => {
    mockConfirm.mockResolvedValue({ data: { success: true } });
    render(<ConfirmPage />);

    await waitFor(() => {
      expect(screen.getByText("confirm.success")).toBeInTheDocument();
    });

    expect(mockConfirm).toHaveBeenCalledTimes(1);
  });
});

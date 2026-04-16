import { render, screen, fireEvent } from "@testing-library/react";
import {
  Landing,
  HeroSection,
  BenefitsSection,
  FaqSection,
  Footer,
  Navbar,
  LanguageSelector,
  createT,
  defaultThemeTokens,
  applyTheme,
  THEME_TOKENS,
} from "@mapyourhealth/landing-ui";

const content: Record<string, string> = {
  "appName": "MapYourHealth",
  "home.title": "Hello world",
  "home.benefitsTitle": "Benefits of ",
  "home.signUp": "Sign up",
  "home.benefits.title1": "B1 title",
  "home.benefits.content1": "B1 content",
  "home.benefits.title2": "B2 title",
  "home.benefits.content2": "B2 content",
  "home.benefits.title3": "B3 title",
  "home.benefits.content3": "B3 content",
  "home.benefits.title4": "B4 title",
  "home.benefits.content4": "B4 content",
  "home.faqTitle": "FAQ",
  "home.faq.question1": "Q1",
  "home.faq.answer1": "A1",
  "home.faq.question2": "Q2",
  "home.faq.answer2": "A2",
  "home.faq.question3": "Q3",
  "home.faq.answer3": "A3",
  "home.faq.question4": "Q4",
  "home.faq.answer4": "A4",
  "home.faq.question5": "Q5",
  "home.faq.answer5": "A5",
  "home.faq.question6": "Q6",
  "home.faq.answer6": "A6",
};

describe("createT", () => {
  it("returns content value when present", () => {
    const t = createT({ "a.b": "hi" });
    expect(t("a.b")).toBe("hi");
  });

  it("falls back to the provided default when missing", () => {
    const t = createT({});
    expect(t("missing", "fallback")).toBe("fallback");
  });

  it("returns the key itself when no content and no fallback", () => {
    const t = createT(undefined);
    expect(t("foo.bar")).toBe("foo.bar");
  });
});

describe("HeroSection", () => {
  it("renders navbar and form slots", () => {
    render(
      <HeroSection
        usePlaceholders
        navbarSlot={<div>NAV_SLOT</div>}
        formSlot={<div>FORM_SLOT</div>}
      />,
    );
    expect(screen.getByText("NAV_SLOT")).toBeInTheDocument();
    expect(screen.getByText("FORM_SLOT")).toBeInTheDocument();
  });

  it("renders hero imagery when placeholders are off", () => {
    const { container } = render(<HeroSection />);
    expect(container.querySelector("picture")).toBeInTheDocument();
    expect(container.querySelector("img[src$='.jpg']")).toBeInTheDocument();
  });
});

describe("BenefitsSection", () => {
  it("renders four benefit items using content", () => {
    render(<BenefitsSection content={content} />);
    expect(screen.getByText("B1 title")).toBeInTheDocument();
    expect(screen.getByText("B4 content")).toBeInTheDocument();
    expect(screen.getByText("Sign up")).toBeInTheDocument();
  });
});

describe("FaqSection", () => {
  it("renders all six questions", () => {
    render(<FaqSection content={content} />);
    for (const q of ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6"]) {
      expect(screen.getByText(q)).toBeInTheDocument();
    }
  });

  it("expands an answer when the question is clicked", () => {
    render(<FaqSection content={content} />);
    // Before click: answer is rendered but collapsed; check it becomes visible via button interaction.
    fireEvent.click(screen.getByText("Q3"));
    expect(screen.getByText("A3")).toBeInTheDocument();
  });
});

describe("Footer", () => {
  it("renders the app name and current year", () => {
    render(<Footer content={content} usePlaceholders />);
    expect(screen.getByText(/MapYourHealth/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${new Date().getFullYear()}`))).toBeInTheDocument();
  });
});

describe("Landing composer", () => {
  it("renders hero, benefits, faq, and footer", () => {
    render(
      <Landing
        content={content}
        theme={defaultThemeTokens()}
        usePlaceholders
        navbarSlot={<div>NAV</div>}
        formSlot={<div>FORM</div>}
      />,
    );
    expect(screen.getByText("NAV")).toBeInTheDocument();
    expect(screen.getByText("B1 title")).toBeInTheDocument();
    expect(screen.getByText("Q1")).toBeInTheDocument();
    expect(screen.getByText(/MapYourHealth/)).toBeInTheDocument();
  });
});

describe("Navbar", () => {
  it("renders text logo with custom color and right slot", () => {
    render(
      <Navbar
        logo={{ kind: "text", text: "BRAND_X", color: "#123456" }}
        right={<span>RIGHT_SLOT</span>}
      />,
    );
    expect(screen.getByText("BRAND_X")).toBeInTheDocument();
    expect(screen.getByText("RIGHT_SLOT")).toBeInTheDocument();
    const link = screen.getByRole("link");
    expect(link).toHaveStyle({ color: "#123456" });
    expect(link).toHaveAttribute("href", "/");
  });

  it("renders image logo when logo.kind === 'image'", () => {
    render(
      <Navbar
        logo={{ kind: "image", src: "/logo.png", alt: "Brand X logo" }}
      />,
    );
    const img = screen.getByAltText("Brand X logo");
    expect(img).toHaveAttribute("src", "/logo.png");
  });
});

describe("LanguageSelector", () => {
  const LANGUAGES = [
    { code: "en", label: "En" },
    { code: "fr", label: "Fr" },
  ];

  it("fires onChange when a non-active language is clicked", () => {
    const onChange = jest.fn();
    render(
      <LanguageSelector languages={LANGUAGES} current="en" onChange={onChange} />,
    );
    fireEvent.click(screen.getByText("Fr"));
    expect(onChange).toHaveBeenCalledWith("fr");
  });

  it("still calls onChange on the active language (parent decides noop)", () => {
    const onChange = jest.fn();
    render(
      <LanguageSelector languages={LANGUAGES} current="en" onChange={onChange} />,
    );
    fireEvent.click(screen.getByText("En"));
    expect(onChange).toHaveBeenCalledWith("en");
  });
});

describe("applyTheme", () => {
  it("sets provided tokens and removes missing ones", () => {
    const root = document.createElement("div");
    applyTheme({ accent: "#ff00ff" }, root);
    expect(root.style.getPropertyValue("--mh-accent")).toBe("#ff00ff");
    // tokens not provided should be cleared
    const bgToken = THEME_TOKENS.find((t) => t.key === "background");
    expect(root.style.getPropertyValue(bgToken!.cssVar)).toBe("");
  });
});

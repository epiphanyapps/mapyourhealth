"use client";

export type LanguageOption = { code: string; label: string };

type Props = {
  languages: LanguageOption[];
  current: string;
  onChange: (code: string) => void;
};

export function LanguageSelector({ languages, current, onChange }: Props) {
  return (
    <div
      className="z-50 flex gap-1 rounded-full p-1 shadow-lg"
      style={{ backgroundColor: "var(--mh-accent-soft)" }}
    >
      {languages.map(({ code, label }) => {
        const active = current === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            className={
              "aspect-square rounded-full p-1 transition-all " +
              (active ? "shadow-sm" : "opacity-50 hover:opacity-75")
            }
            style={active ? { backgroundColor: "#e5e5e5" } : undefined}
          >
            <span
              className="text-lg"
              style={{
                color: active ? "var(--mh-accent)" : "var(--mh-accent-fg)",
                fontFamily: "var(--mh-font-regular)",
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

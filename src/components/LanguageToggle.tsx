import { useI18n, type Lang } from "@/lib/i18n";

export function LanguageToggle({ variant }: { variant?: "default" | "sidebar" }) {
  const { lang, setLang } = useI18n();

  const btn = (l: Lang, label: string) => {
    const activeClasses =
      variant === "sidebar"
        ? "bg-primary/25 text-primary"
        : "bg-ink text-parchment";
    const inactiveClasses =
      variant === "sidebar"
        ? "text-[oklch(0.88_0.015_60/0.5)] hover:text-[oklch(0.88_0.015_60/0.9)]"
        : "text-muted-foreground hover:text-ink";

    return (
      <button
        key={l}
        type="button"
        onClick={() => setLang(l)}
        className={`px-3 py-1 text-xs transition ${
          variant === "sidebar" ? "font-semibold tracking-wide" : "font-medium"
        } ${lang === l ? activeClasses : inactiveClasses}`}
        aria-pressed={lang === l}
      >
        {label}
      </button>
    );
  };

  const containerClasses =
    variant === "sidebar"
      ? "inline-flex overflow-hidden rounded-full border border-white/15 bg-white/5"
      : "inline-flex overflow-hidden rounded-full border border-border bg-card";

  return (
    <div className={containerClasses}>
      {btn("bm", "BM")}
      {btn("en", "EN")}
    </div>
  );
}

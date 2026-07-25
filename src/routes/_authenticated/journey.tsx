import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Clock, Sparkles, Scroll, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, STRINGS, type StringKey } from "@/lib/i18n";
import { artifactImageUrl } from "@/lib/artifact-images";
import {
  CATEGORY_META,
  ZONE_LAYOUT,
  ROUTE_INDEX,
  type CategoryKey,
} from "@/lib/museum";

export const Route = createFileRoute("/_authenticated/journey")({
  component: JourneyPage,
});

async function fetchJourney() {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return [];
  const { data } = await supabase
    .from("user_artifact_progress")
    .select("artifact_id, scanned_at, artifacts(id, name_bm, name_en, category, image_url)")
    .eq("user_id", uid)
    .order("scanned_at", { ascending: false });
  return data ?? [];
}

function formatWhen(iso: string, lang: "bm" | "en"): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return lang === "bm" ? "baru sahaja" : "just now";
  if (mins < 60) return lang === "bm" ? `${mins} min lalu` : `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return lang === "bm" ? `${hrs} jam lalu` : `${hrs}h ago`;
  return d.toLocaleString(lang === "bm" ? "ms-MY" : "en-MY", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function JourneyPage() {
  const { t, lang } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ["journey"], queryFn: fetchJourney });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="flex items-center gap-3">
        <Link
          to="/profile"
          className="bounce-soft grid size-10 place-items-center rounded-full border-2 border-border bg-card shadow-sm"
          aria-label={t("back")}
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {t("journey_kicker")}
          </p>
          <h1 className="font-display text-3xl leading-tight">{t("journey_title")}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("journey_sub")}</p>
        </div>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">…</p>
      ) : !data || data.length === 0 ? (
        <div className="game-card grid place-items-center gap-3 p-10 text-center">
          <Scroll className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("no_artifacts")}</p>
          <Link
            to="/scan"
            className="bounce-soft rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
          >
            {t("nav_scan")}
          </Link>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[31px] top-4 bottom-4 w-0.5 bg-border/60" />

          <ol className="space-y-4">
            {data.map((row, i) => {
              const art = (
                row as {
                  artifacts?: {
                    id: string;
                    name_bm: string;
                    name_en: string;
                    category: string;
                    image_url: string | null;
                  } | null;
                }
              ).artifacts;
              if (!art) return null;
              const cat = art.category as CategoryKey;
              const meta = CATEGORY_META[cat] ?? { emoji: "📦", color: "oklch(0.55 0.04 260)", bg: "oklch(0.94 0.02 260)" };
              const nm = lang === "bm" ? art.name_bm : art.name_en;
              const imageUrl = artifactImageUrl(art.id, art.image_url);
              const isLatest = i === 0;
              const routeNum = ROUTE_INDEX[art.id] ?? null;
              const zoneLabel = ZONE_LAYOUT[cat]
                ? lang === "bm"
                  ? ZONE_LAYOUT[cat].label_bm
                  : ZONE_LAYOUT[cat].label_en
                : null;

              return (
                <li
                  key={`${row.artifact_id}-${row.scanned_at}`}
                  className="animate-in fade-in slide-in-from-bottom-3 duration-300"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div
                    className={`relative flex items-start gap-4 rounded-2xl border-2 bg-card p-3 transition-all duration-200 ${
                      isLatest
                        ? "border-primary/50 shadow-md shadow-primary/10"
                        : "border-border hover:border-border/80 hover:shadow-sm"
                    }`}
                  >
                    {/* Colored accent bar */}
                    <div
                      className="absolute left-0 top-0 h-full w-1 rounded-l-xl"
                      style={{
                        background: meta.color,
                        opacity: isLatest ? 0.9 : 0.5,
                      }}
                    />

                    {/* Timeline dot */}
                    <div
                      className="relative z-10 mt-1 grid size-[14px] shrink-0 place-items-center rounded-full border-2 border-white"
                      style={{ background: meta.color }}
                    >
                      <div
                        className={`size-[6px] rounded-full bg-white ${
                          isLatest ? "animate-ping" : ""
                        }`}
                        style={{ animationDuration: "2s" }}
                      />
                    </div>

                    {/* Artifact thumbnail */}
                    <div
                      className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl"
                      style={{ background: meta.bg }}
                    >
                      {imageUrl ? (
                        <img src={imageUrl} alt={nm} className="h-full w-full object-contain p-1.5" />
                      ) : (
                        <span className="text-2xl">{meta.emoji}</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Route number badge */}
                        {routeNum !== null && (
                          <span
                            className="inline-flex size-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                            style={{ background: meta.color }}
                          >
                            {routeNum}
                          </span>
                        )}

                        {/* Category badge */}
                        <span
                          className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          {meta.emoji} {`category_${cat}` in STRINGS ? t(`category_${cat}` as StringKey) : cat}
                        </span>

                        {/* Latest badge */}
                        {isLatest && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-primary">
                            <Sparkles className="size-2.5" /> {t("journey_latest")}
                          </span>
                        )}
                      </div>

                      {/* Artifact name */}
                      <h3 className="mt-0.5 truncate font-display text-lg leading-tight">{nm}</h3>

                      {/* Meta row: zone + timestamp */}
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        {zoneLabel && (
                          <span className="inline-flex items-center gap-0.5">
                            <MapPin className="size-3" />
                            {zoneLabel}
                          </span>
                        )}
                        <span className="text-muted-foreground/40">·</span>
                        <span className="inline-flex items-center gap-0.5">
                          <Clock className="size-3" />
                          {formatWhen(row.scanned_at, lang)}
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { artifactImageUrl } from "@/lib/artifact-images";
import { CATEGORY_META, TOTAL_ARTIFACTS, type CategoryKey } from "@/lib/museum";
import { Book, ScrollText, Award, MapPin, Star, Zap, Sparkles, Trophy, ArrowRight, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/journal")({
  component: JournalPage,
});

async function fetchJournal() {
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData.user?.id;
  const [
    { data: prog },
    { data: scans },
    { data: artifacts },
    { data: badges },
    { data: earnedBadges },
    { data: quests },
    { data: doneQuests },
  ] = await Promise.all([
    supabase.from("user_progress").select("*").eq("user_id", uid ?? "").maybeSingle(),
    supabase.from("user_artifact_progress").select("*").eq("user_id", uid ?? "").order("scanned_at"),
    supabase.from("artifacts").select("*"),
    supabase.from("badges").select("*").order("sort_order"),
    supabase.from("user_badges").select("badge_id").eq("user_id", uid ?? ""),
    supabase.from("quests").select("*").order("sort_order"),
    supabase.from("user_quests").select("quest_id").eq("user_id", uid ?? ""),
  ]);
  const artMap = new Map((artifacts ?? []).map((a) => [a.id, a]));
  const badgeSet = new Set((earnedBadges ?? []).map((b) => b.badge_id));
  const questSet = new Set((doneQuests ?? []).map((q) => q.quest_id));
  return {
    prog,
    scans: scans ?? [],
    artMap,
    badges: (badges ?? []).filter((b) => badgeSet.has(b.id)),
    quests: (quests ?? []).filter((q) => questSet.has(q.id)),
  };
}

function JournalPage() {
  const { t, lang } = useI18n();
  const { data } = useQuery({ queryKey: ["journal"], queryFn: fetchJournal });

  if (!data) return null;

  const { prog, scans, artMap, badges, quests } = data;
  const scanPct = Math.round((scans.length / TOTAL_ARTIFACTS) * 100);

  // Group scans by category for the category breakdown
  const scansByCategory: Record<string, number> = {};
  scans.forEach((s) => {
    const a = artMap.get(s.artifact_id);
    if (a) {
      scansByCategory[a.category] = (scansByCategory[a.category] ?? 0) + 1;
    }
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <header className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {t("journal_title")}
        </p>
        <h1 className="font-display text-4xl">{t("journal_title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("journal_sub")}</p>
      </header>

      {/* Stats row */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75 grid grid-cols-3 gap-3">
        <div className="game-card flex flex-col items-center gap-1.5 p-4 text-center">
          <div className="grid size-10 place-items-center rounded-full bg-primary/10">
            <Zap className="size-5 text-primary" />
          </div>
          <p className="font-display text-2xl text-primary tabular-nums">{prog?.total_exp ?? 0}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("total_exp")}</p>
        </div>
        <div className="game-card flex flex-col items-center gap-1.5 p-4 text-center">
          <div className="grid size-10 place-items-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Star className="size-5 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="font-display text-2xl text-amber-600 dark:text-amber-400 tabular-nums">{prog?.current_level ?? 1}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("level")}</p>
        </div>
        <div className="game-card flex flex-col items-center gap-1.5 p-4 text-center">
          <div className="grid size-10 place-items-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
            <Trophy className="size-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="font-display text-2xl text-indigo-600 dark:text-indigo-400 tabular-nums">{prog?.discount_points ?? 0}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("points")}</p>
        </div>
      </div>

      {/* Discovery progress section */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 game-card overflow-hidden">
        <div className="border-b border-border bg-gradient-to-r from-primary/5 to-amber-50 p-5 dark:from-primary/5 dark:to-amber-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScrollText className="size-5 text-primary" />
              <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                {t("journal_artifacts_discovered")}
              </span>
            </div>
            <span className="font-display text-lg tabular-nums text-primary">{scans.length}/{TOTAL_ARTIFACTS}</span>
          </div>
          {/* Overall progress bar */}
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/50 dark:bg-black/30">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-amber-400 to-indigo-400 transition-all duration-1000 ease-out"
              style={{ width: `${scanPct}%` }}
            />
          </div>
          {/* Category breakdown */}
          {scans.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(scansByCategory).map(([cat, count]) => {
                const meta = CATEGORY_META[cat as CategoryKey];
                return (
                  <span
                    key={cat}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: meta?.bg ?? 'oklch(0.92 0 0)', color: meta?.color ?? 'oklch(0.5 0 0)' }}
                  >
                    {meta?.emoji} {count}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Scan list - if empty, show a CTA */}
        <div className="p-5">
          {scans.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Book className="size-12 text-muted-foreground/40" />
              <p className="font-display text-lg text-muted-foreground">{t("no_artifacts")}</p>
              <Link
                to="/map"
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:shadow-lg"
              >
                <MapPin className="size-4" />
                {lang === "bm" ? "Mula Teroka" : "Start Exploring"}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          ) : (
            <ol className="relative space-y-3">
              {/* Timeline line */}
              <div className="absolute bottom-0 left-[15px] top-0 w-0.5 bg-gradient-to-b from-primary via-amber-400 to-muted-foreground/30" />
              {[...scans].reverse().map((s, i) => {
                const a = artMap.get(s.artifact_id);
                if (!a) return null;
                const name = lang === "bm" ? a.name_bm : a.name_en;
                const imageUrl = artifactImageUrl(a.id, a.image_url);
                const meta = CATEGORY_META[a.category as CategoryKey];
                const isLatest = i === 0;
                return (
                  <li
                    key={s.artifact_id}
                    className={`relative ml-8 transition-all duration-300 hover:-translate-x-0.5 ${
                      isLatest ? "" : ""
                    }`}
                    style={{ animationDelay: `${250 + i * 60}ms` }}
                  >
                    {/* Timeline dot */}
                    <div
                      className={`absolute -left-8 top-3 grid size-4 place-items-center rounded-full border-2 bg-card transition-all duration-300 ${
                        isLatest
                          ? "border-primary shadow-[0_0_0_4px] shadow-primary/20"
                          : "border-border"
                      }`}
                      style={{ borderColor: isLatest ? undefined : meta?.color ?? 'oklch(0.87 0 0)' }}
                    >
                      <div
                        className={`size-1.5 rounded-full ${isLatest ? "bg-primary animate-pulse" : ""}`}
                        style={{ backgroundColor: isLatest ? undefined : meta?.color ?? 'oklch(0.5 0 0)' }}
                      />
                    </div>

                    <div className="game-card overflow-hidden transition-all duration-200 hover:shadow-md">
                      <div className="flex items-center gap-3 p-3">
                        <div
                          className="grid size-14 shrink-0 place-items-center rounded-xl border-2 bg-white/50 dark:bg-black/20"
                          style={{ borderColor: meta?.color ?? 'oklch(0.87 0 0)' }}
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={name}
                              className="size-11 rounded-lg object-contain"
                              loading="lazy"
                            />
                          ) : (
                            <span className="text-lg">{meta?.emoji}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="truncate font-display text-base">{name}</h3>
                            {isLatest && (
                              <Sparkles className="size-3.5 shrink-0 text-primary animate-pulse" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {meta?.emoji} {lang === "bm" ? a.era_bm : a.era_en}
                            <span className="mx-1">·</span>
                            {lang === "bm" ? a.origin_bm : a.origin_en}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-xs text-foreground/70">
                            {lang === "bm" ? a.description_bm : a.description_en}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-xs font-semibold text-primary tabular-nums">+{s.exp_earned}</span>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(s.scanned_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>

      {/* Completed quests */}
      {quests.length > 0 && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-225 game-card overflow-hidden p-5">
          <div className="mb-3 flex items-center gap-2">
            <Award className="size-5 text-amber-500" />
            <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{t("nav_quests")}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {quests.map((q) => (
              <div
                key={q.id}
                className="flex items-center gap-2.5 rounded-xl bg-accent/50 px-3.5 py-2.5"
              >
                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-jungle/10">
                  <Check className="size-4 text-jungle" />
                </div>
                <span className="flex-1 text-sm font-medium">{lang === "bm" ? q.name_bm : q.name_en}</span>
                <span className="text-xs font-semibold text-primary">+{q.exp_reward}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Earned badges */}
      {badges.length > 0 && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 game-card overflow-hidden p-5">
          <div className="mb-3 flex items-center gap-2">
            <Star className="size-5 text-amber-500" />
            <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{t("profile_earned_all")}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <div
                key={b.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-accent to-amber-50 px-3.5 py-1.5 text-xs font-medium dark:from-accent dark:to-amber-950/20"
              >
                <span>{lang === "bm" ? b.name_bm : b.name_en}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

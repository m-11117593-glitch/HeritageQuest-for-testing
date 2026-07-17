import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flag, Check, Sparkles, AlertTriangle, Trophy, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { CATEGORY_META, ZONE_LAYOUT, type CategoryKey } from "@/lib/museum";

export const Route = createFileRoute("/_authenticated/quests")({
  component: QuestsPage,
});

async function fetchQuests() {
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData.user?.id;
  const [
    { data: quests },
    { data: done },
    { data: scanned },
    { data: artifacts },
    { data: uqTmpls },
    { data: userUq },
  ] = await Promise.all([
    supabase.from("quests").select("*").order("sort_order"),
    supabase.from("user_quests").select("quest_id").eq("user_id", uid ?? ""),
    supabase.from("user_artifact_progress").select("artifact_id").eq("user_id", uid ?? ""),
    supabase.from("artifacts").select("id,category,name_bm,name_en"),
    supabase.from("unique_quest_templates").select("*").order("sort_order"),
    supabase.from("user_unique_quests").select("*").eq("user_id", uid ?? ""),
  ]);
  const doneSet = new Set((done ?? []).map((q) => q.quest_id));
  const scannedSet = new Set((scanned ?? []).map((s) => s.artifact_id));
  const byCat: Record<string, string[]> = {};
  for (const a of artifacts ?? []) (byCat[a.category] ??= []).push(a.id);
  const uqByTmpl = new Map((userUq ?? []).map((u) => [u.template_id, u]));
  return { quests: quests ?? [], doneSet, scannedSet, byCat, uqTmpls: uqTmpls ?? [], uqByTmpl };
}

function QuestsPage() {
  const { t, lang } = useI18n();
  const { data } = useQuery({ queryKey: ["quests"], queryFn: fetchQuests });
  const quests = data?.quests ?? [];
  const uqTmpls = data?.uqTmpls ?? [];
  const visibleUniqueQuests = uqTmpls.filter((tmpl) => {
    const status = data?.uqByTmpl.get(tmpl.id)?.status;
    return status === "active" || status === "completed" || status === "failed";
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
          {t("nav_quests")}
        </p>
        <h1 className="font-display text-3xl">{t("nav_quests")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("quests_intro")}</p>
      </header>

      {visibleUniqueQuests.length > 0 && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="mb-4 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-gold to-primary text-white shadow-md wiggle">
              <Sparkles className="size-4" />
            </span>
            <div>
              <h2 className="font-display text-xl">{t("quest_unique")}</h2>
              <p className="text-xs text-muted-foreground">{t("quest_unique_intro")}</p>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {visibleUniqueQuests.map((tmpl, idx) => {
              const state = data?.uqByTmpl.get(tmpl.id);
              const status = state?.status ?? "active";
              const completed = status === "completed";
              const cat = tmpl.target_category as CategoryKey;
              const meta = CATEGORY_META[cat];
              const zoneLabel = lang === "bm" ? ZONE_LAYOUT[cat].label_bm : ZONE_LAYOUT[cat].label_en;
              const badgeText =
                status === "completed"
                  ? t("quest_completed")
                  : status === "active"
                    ? t("quest_active")
                    : t("quest_failed");
              const badgeColor =
                status === "completed"
                  ? "border-jungle/40 bg-jungle/10 text-jungle"
                  : status === "active"
                    ? "border-gold bg-gold/30 text-gold-foreground"
                    : "border-destructive/40 bg-destructive/10 text-destructive";
              const progress = state?.correct_scans ?? 0;
              const total = tmpl.target_count;

              return (
                <li
                  key={tmpl.id}
                  className={`animate-in fade-in slide-in-from-bottom-4 duration-400 ${idx * 80}ms`}
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <div
                    className={`relative game-card overflow-hidden p-4 transition-all duration-200 ${
                      status === "active" ? "border-gold" : ""
                    } ${completed ? "bg-muted/60" : ""} ${
                      status === "active" ? "hover:-translate-y-0.5 hover:shadow-md" : ""
                    }`}
                  >
                    {/* Category color accent bar */}
                    <div
                      className="absolute left-0 top-0 h-full w-1"
                      style={{
                        background: completed ? "oklch(0.72 0.09 165)" : meta.color,
                        opacity: completed ? 0.4 : 0.7,
                      }}
                    />

                    {/* Completed / failed badge */}
                    {completed && (
                      <div className="mb-3 flex">
                        <span className="inline-flex items-center gap-1 rounded-full border border-jungle/40 bg-jungle/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-jungle">
                          <Check className="size-3" /> {t("quest_completed")}
                        </span>
                      </div>
                    )}

                    <div className={completed ? "grayscale opacity-60" : ""}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span
                            className="grid size-10 shrink-0 place-items-center rounded-full text-lg shadow-xs"
                            style={{ background: meta.bg, color: meta.color }}
                          >
                            {meta.emoji}
                          </span>
                          <div>
                            <h3 className="font-display text-base leading-tight">
                              {lang === "bm" ? tmpl.name_bm : tmpl.name_en}
                            </h3>
                            <span className={`chip mt-0.5 ${badgeColor}`}>{badgeText}</span>
                          </div>
                        </div>
                      </div>

                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                        {lang === "bm" ? tmpl.description_bm : tmpl.description_en}
                      </p>

                      {/* Segmented progress bar */}
                      <div className="mt-3 flex items-center gap-3">
                        <div className="flex h-2 flex-1 gap-1">
                          {Array.from({ length: total }, (_, i) => (
                            <div
                              key={i}
                              className={`h-full flex-1 rounded-full transition-all duration-500 ${
                                i < progress
                                  ? "bg-gradient-to-r from-primary to-gold"
                                  : i === progress && status === "active"
                                    ? "animate-pulse bg-primary/40"
                                    : "bg-border"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="tabular-nums text-[11px] font-semibold text-muted-foreground">
                          {progress}/{total}
                        </span>
                      </div>

                      {/* Zone label */}
                      <p className="mt-1 text-[10px] text-muted-foreground/60">
                        {zoneLabel}
                      </p>

                      {/* Reward / penalty chips */}
                      <div className="mt-3 flex gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full border border-jungle/40 bg-jungle/10 px-2 py-0.5 text-[10px] font-semibold text-jungle">
                          <Sparkles className="size-3" /> x{tmpl.reward_multiplier} EXP
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                          <AlertTriangle className="size-3" /> -{tmpl.penalty_exp} EXP
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-jungle to-emerald-400 text-white shadow-md">
            <Flag className="size-4" />
          </span>
          <div>
            <h2 className="font-display text-xl">{t("quest_normal")}</h2>
            <p className="text-xs text-muted-foreground">{t("quests_intro")}</p>
          </div>
        </div>
        <ul className="space-y-3">
          {quests.map((q, idx) => {
            const done = data?.doneSet.has(q.id) ?? false;
            const targetIds =
              q.type === "grand"
                ? Object.values(data?.byCat ?? {}).flat()
                : (data?.byCat[q.category ?? ""] ?? []);
            const progress = targetIds.filter((id) => data?.scannedSet.has(id)).length;
            const total = targetIds.length || 1;
            const pct = Math.round((progress / total) * 100);
            const cat = q.category as CategoryKey | null;
            const meta = cat && CATEGORY_META[cat] ? CATEGORY_META[cat] : null;
            const isGrand = q.type === "grand";
            const zoneLabel =
              cat && ZONE_LAYOUT[cat]
                ? lang === "bm"
                  ? ZONE_LAYOUT[cat].label_bm
                  : ZONE_LAYOUT[cat].label_en
                : null;

            return (
              <li
                key={q.id}
                className="animate-in fade-in slide-in-from-bottom-4 duration-400"
                style={{ animationDelay: `${(visibleUniqueQuests.length + idx) * 80}ms` }}
              >
                <div
                  className={`relative game-card overflow-hidden p-4 transition-all duration-200 ${
                    isGrand ? "border-2 border-dashed" : ""
                  } ${done ? "bg-muted/60" : "hover:-translate-y-0.5 hover:shadow-md"} ${
                    isGrand && !done ? "border-gold/40" : ""
                  }`}
                  style={
                    isGrand && !done
                      ? { borderColor: "oklch(0.86 0.1 70 / 0.4)" }
                      : undefined
                  }
                >
                  {/* Category color accent bar */}
                  {meta && (
                    <div
                      className="absolute left-0 top-0 h-full w-1"
                      style={{
                        background: done ? "oklch(0.72 0.09 165)" : meta.color,
                        opacity: done ? 0.4 : 0.7,
                      }}
                    />
                  )}

                  {/* Grand quest gets a gold accent */}
                  {isGrand && !done && (
                    <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-gold opacity-70" />
                  )}

                  {done && (
                    <div className="mb-3 flex">
                      <span className="inline-flex items-center gap-1 rounded-full border border-jungle/40 bg-jungle/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-jungle">
                        <Check className="size-3" /> {t("quest_completed")}
                      </span>
                    </div>
                  )}

                  <div className={done ? "grayscale opacity-60" : ""}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span
                          className="grid size-10 shrink-0 place-items-center rounded-full text-lg shadow-xs"
                          style={
                            meta
                              ? { background: meta.bg, color: meta.color }
                              : {
                                  background: "oklch(0.94 0.06 70)",
                                  color: "oklch(0.6 0.15 60)",
                                }
                          }
                        >
                          {isGrand ? (
                            <Trophy className="size-5" />
                          ) : (
                            (meta?.emoji ?? "🎯")
                          )}
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-display text-lg leading-tight">
                            {lang === "bm" ? q.name_bm : q.name_en}
                          </h3>
                          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                            {lang === "bm" ? q.description_bm : q.description_en}
                          </p>
                          {zoneLabel && !isGrand && (
                            <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                              📍 {zoneLabel}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* EXP reward — styled like a coin */}
                      <div className="shrink-0 text-right">
                        <div className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 px-3 py-1.5 shadow-inner dark:from-amber-900/30 dark:to-amber-800/20">
                          <Coins className="size-3.5 text-gold" />
                          <span className="font-display text-lg font-bold text-gold-foreground">
                            +{q.exp_reward}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[9px] uppercase tracking-widest text-muted-foreground/60">
                          EXP
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 flex items-center gap-3">
                      {!isGrand && cat ? (
                        /* Segmented — one segment per artifact */
                        <div className="flex h-2 flex-1 gap-1">
                          {Array.from({ length: total }, (_, i) => (
                            <div
                              key={i}
                              className={`h-full flex-1 rounded-full transition-all duration-500 ${
                                i < progress
                                  ? `bg-gradient-to-r ${done ? "from-jungle to-emerald-400" : "from-jungle to-gold"}`
                                  : i === progress && !done
                                    ? "animate-pulse bg-jungle/30"
                                    : "bg-border"
                              }`}
                            />
                          ))}
                        </div>
                      ) : (
                        /* Continuous bar for grand quest */
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-gold transition-[width] duration-500 ease-out"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                      <span className="tabular-nums text-xs font-semibold text-muted-foreground">
                        {progress}/{total}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

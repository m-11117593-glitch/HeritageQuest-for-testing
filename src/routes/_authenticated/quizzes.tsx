import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Award, Sparkles, CheckCircle2, ArrowRight, Brain, Star, Zap, Scan, QrCode, Skull, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { artifactImageUrl } from "@/lib/artifact-images";
import { CATEGORY_META, ZONE_LAYOUT, type CategoryKey } from "@/lib/museum";
import { sfx } from "@/lib/sfx";
import { HardModeUnlockPopup } from "@/components/HardModeUnlockPopup";

export const Route = createFileRoute("/_authenticated/quizzes")({
  component: QuizzesPage,
});

async function fetchQuizzes() {
  const [{ data: artifacts }, { data: progress }] = await Promise.all([
    supabase
      .from("artifacts")
      .select("id, category, name_bm, name_en, image_url")
      .order("sort_order"),
    supabase.from("user_artifact_progress").select("*")
  ]);

  const progressMap = new Map((progress ?? []).map((p) => [p.artifact_id, p]));
  const hasAnyProgress = (progress ?? []).length > 0;
  return { artifacts: artifacts ?? [], progressMap, hasAnyProgress };
}

function QuizzesPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [hmActive, setHmActive] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem('hm-active') === 'true' : false
  );
  const [showUnlock, setShowUnlock] = useState(false);
  const hmUnlocked = typeof window !== "undefined" ? localStorage.getItem('hm-unlocked') === 'true' : false;

  useEffect(() => {
    // Check if unlock just happened
    if (hmUnlocked && !hmActive && !showUnlock) {
      const alreadyShown = localStorage.getItem('hm-shown-popup');
      if (!alreadyShown) {
        setShowUnlock(true);
        localStorage.setItem('hm-shown-popup', 'true');
      }
    }
  }, [hmUnlocked, hmActive, showUnlock]);

  function handleHmToggle() {
    const next = !hmActive;
    setHmActive(next);
    localStorage.setItem('hm-active', next ? 'true' : 'false');
    if (next) sfx.hardFanfare();
    else sfx.pop();
  }

  function handleHardModeAccept() {
    setShowUnlock(false);
    setHmActive(true);
    localStorage.setItem('hm-active', 'true');
  }

  function handleHardModeDecline() {
    setShowUnlock(false);
  }
  const { data } = useQuery({ queryKey: ["quizzes"], queryFn: fetchQuizzes });
  const artifacts = data?.artifacts ?? [];
  const progressMap = data?.progressMap ?? new Map<string, any>();
  const hasAnyProgress = data?.hasAnyProgress ?? false;

  const available = artifacts.filter((a) => {
    const p = progressMap.get(a.id);
    return p && (p.quiz_correct_count === null || p.quiz_correct_count === undefined);
  });

  const completed = artifacts
    .map((a) => ({ a, p: progressMap.get(a.id) }))
    .filter(({ p }) => p && p.quiz_correct_count !== null && p.quiz_correct_count !== undefined);

  const totalCorrect = completed.reduce((sum, { p }) => sum + (p.quiz_correct_count ?? 0), 0);
  const totalQuestions = completed.reduce((sum, { p }) => sum + (p.quiz_total_questions ?? 0), 0);
  const overallPct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const perfectCount = completed.filter(({ p }) => p.quiz_correct_count === p.quiz_total_questions).length;

  // Group available by category
  const grouped = available.reduce((acc, a) => {
    const cat = a.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(a);
    return acc;
  }, {} as Record<string, typeof artifacts>);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Hard mode unlock popup */}
      {showUnlock && (
        <HardModeUnlockPopup
          onAccept={handleHardModeAccept}
          onDecline={handleHardModeDecline}
        />
      )}

      <header className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{t("nav_quizzes")}</p>
            <h1 className="font-display text-3xl">{t("nav_quizzes")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("quiz_title")}</p>
          </div>
          {/* Normal/Hard toggle — only visible when hard mode is unlocked */}
          {hmUnlocked && (
            <button
              type="button"
              onClick={handleHmToggle}
              className={`relative flex items-center gap-2 rounded-full border-2 px-4 py-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-300 ${
                hmActive
                  ? "border-red-500/40 bg-red-950/30 text-red-400 shadow-lg shadow-red-900/20"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              {hmActive ? (
                <>
                  <Skull className="size-4" />
                  {t("hm_toggle").split(" / ")[1] || t("hm_toggle")}
                  <Shield className="size-3.5 text-amber-500" />
                </>
              ) : (
                <>
                  <Shield className="size-4 text-primary" />
                  {t("hm_toggle").split(" / ")[0] || t("hm_toggle")}
                </>
              )}
            </button>
          )}
        </div>
      </header>

      {/* Overview stats */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75 grid grid-cols-3 gap-3">
        <div className="game-card flex flex-col items-center gap-1.5 p-4 text-center">
          <div className="grid size-10 place-items-center rounded-full bg-primary/10">
            <Brain className="size-5 text-primary" />
          </div>
          <p className="font-display text-2xl text-primary">{completed.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("done")}</p>
        </div>
        <div className="game-card flex flex-col items-center gap-1.5 p-4 text-center">
          <div className="grid size-10 place-items-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Sparkles className="size-5 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="font-display text-2xl text-amber-600 dark:text-amber-400">{overallPct}%</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("overall_title")}</p>
        </div>
        <div className="game-card flex flex-col items-center gap-1.5 p-4 text-center">
          <div className="grid size-10 place-items-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
            <Star className="size-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="font-display text-2xl text-indigo-600 dark:text-indigo-400">{perfectCount}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("perfect")}</p>
        </div>
      </div>

      {/* Available quizzes grouped by category */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl">
          <Zap className="size-5 text-primary" />
          {t("quiz_title")}
          <span className="text-sm font-normal text-muted-foreground">({available.length})</span>
        </h2>
        {available.length === 0 && !hasAnyProgress ? (
          <div className="game-card flex flex-col items-center gap-4 p-10 text-center">
            <div className="relative">
              <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-gold/20">
                <QrCode className="size-10 text-primary" />
              </div>
              <div className="absolute -right-1 -top-1 flex size-8 items-center justify-center rounded-full bg-gold text-[11px] font-bold text-white shadow-md animate-bounce">
                <Scan className="size-4" />
              </div>
            </div>
            <div>
              <p className="font-display text-xl text-ink">{t("quiz_empty_title")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("quiz_empty_sub")}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                sfx.pop();
                setTimeout(() => sfx.tap(), 90);
                void navigate({ to: "/scan" });
              }}
              className="bounce-soft inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-gold px-6 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 active:scale-95"
            >
              <Scan className="size-4" />
              {t("quiz_empty_cta")}
            </button>
          </div>
        ) : available.length === 0 && hasAnyProgress ? (
          <div className="game-card flex flex-col items-center gap-3 p-8 text-center">
            <CheckCircle2 className="size-12 text-jungle" />
            <p className="font-display text-lg text-jungle">{t("all_done")}</p>
            <p className="text-sm text-muted-foreground">{t("none_yet")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([cat, items]) => {
              const meta = CATEGORY_META[cat as CategoryKey];
              return (
                <div key={cat}>
                  <div
                    className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider"
                    style={{ color: meta?.color }}
                  >
                    <span>{meta?.emoji}</span>
                    <span>{lang === "bm" ? ZONE_LAYOUT?.[cat as CategoryKey]?.label_bm : ZONE_LAYOUT?.[cat as CategoryKey]?.label_en}</span>
                    <span className="h-px flex-1" style={{ backgroundColor: meta?.color, opacity: 0.2 }} />
                  </div>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {items.map((a, idx) => {
                      const meta = CATEGORY_META[a.category as CategoryKey];
                      return (
                        <li
                          key={a.id}
                          className="game-card overflow-hidden transition-all duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-md"
                          style={{ animationDelay: `${idx * 80}ms` }}
                        >
                          <div className="flex items-center gap-3 p-3">
                            <div
                              className="grid size-14 shrink-0 place-items-center rounded-xl border-2 bg-white/50 dark:bg-black/20"
                              style={{ borderColor: meta?.color ?? 'oklch(0.87 0 0)' }}
                            >
                              <img
                                src={artifactImageUrl(a.id, a.image_url) ?? undefined}
                                alt={lang === "bm" ? a.name_bm : a.name_en}
                                className="size-12 rounded-lg object-contain"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="truncate font-display text-sm leading-tight">
                                {lang === "bm" ? a.name_bm : a.name_en}
                              </h3>
                              <Link
                                to="/artifact/$id"
                                params={{ id: a.id }}
                                className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/20"
                              >
                                {t("quiz_cta")}
                                <ArrowRight className="size-3" />
                              </Link>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Completed quizzes */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-225">
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl">
          <Award className="size-5 text-amber-500" />
          {t("view_all")}
          <span className="text-sm font-normal text-muted-foreground">({completed.length})</span>
        </h2>
        {completed.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("none_yet")}</p>
        ) : (
          <div className="space-y-2">
            {completed.map(({ a, p }: any, idx: number) => {
              const pct = p.quiz_total_questions > 0
                ? Math.round((p.quiz_correct_count / p.quiz_total_questions) * 100)
                : 0;
              const isPerfect = pct === 100;
              const meta = CATEGORY_META[a.category as CategoryKey];
              return (
                <div
                  key={a.id}
                  className="game-card overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <div className="flex items-center gap-3 p-3">
                    <div
                      className="grid size-12 shrink-0 place-items-center rounded-xl border-2 bg-white/50 dark:bg-black/20"
                      style={{ borderColor: isPerfect ? 'oklch(0.72 0.18 150)' : (meta?.color ?? 'oklch(0.87 0 0)') }}
                    >
                      <img
                        src={artifactImageUrl(a.id, a.image_url) ?? undefined}
                        alt={lang === "bm" ? a.name_bm : a.name_en}
                        className="size-9 rounded-lg object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="truncate font-display text-sm leading-tight">
                        {lang === "bm" ? a.name_bm : a.name_en}
                      </h3>
                      {/* Score bar */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-accent">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: isPerfect ? 'oklch(0.72 0.18 150)' : 'oklch(0.62 0.15 240)',
                            }}
                          />
                        </div>
                        <span className="shrink-0 text-xs font-semibold tabular-nums">{p.quiz_correct_count}/{p.quiz_total_questions}</span>
                      </div>
                    </div>
                    {isPerfect && (
                      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-jungle/10">
                        <Star className="size-4 text-jungle" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

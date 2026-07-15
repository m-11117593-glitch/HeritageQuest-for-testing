import { useMemo, useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  HelpCircle,
  Sparkles,
  XCircle,
  TrendingUp,
  Award,
  ArrowRight,
  Star,
  Skull,
} from "lucide-react";
import { buildArtifactQuiz, type ArtifactQuizArtifact } from "@/lib/artifact-quizzes";
import { useI18n } from "@/lib/i18n";
import { scanArtifact, type ScanResult } from "@/lib/museum.functions";
import { sfx } from "@/lib/sfx";
import { CATEGORY_META, type CategoryKey } from "@/lib/museum";

interface Props {
  artifact: ArtifactQuizArtifact;
  alreadyCompleted: boolean;
  completion: ScanResult | null;
  onCompleted?: (result: ScanResult) => void;
  onInProgressChange?: (v: boolean) => void;
  hardMode?: boolean;
  onHardModeUnlock?: () => void;
}

import { FeedbackPopup, ConfettiBurst, PulseRing, ComboMeter } from "@/components/quiz-animations";
import { LevelUpPopup } from "@/components/LevelUpPopup";

/* ── Main Quiz Section ── */
export function ArtifactQuizSection({
  artifact,
  alreadyCompleted,
  completion,
  onCompleted,
  onInProgressChange,
  hardMode = false,
  onHardModeUnlock,
}: Props) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const submitQuiz = useServerFn(scanArtifact);
  const questions = useMemo(() => buildArtifactQuiz(artifact, hardMode), [artifact, hardMode]);
  const isHardMode = hardMode === true;

  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [localCompletion, setLocalCompletion] = useState<ScanResult | null>(null);
  const [lockedByServer, setLockedByServer] = useState(alreadyCompleted);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Animation states
  const [feedbackType, setFeedbackType] = useState<"correct" | "wrong" | null>(null);
  const [feedbackKey, setFeedbackKey] = useState(0);
  const [transitionDir, setTransitionDir] = useState<"in" | "out">("in");
  const [showNext, setShowNext] = useState(false);
  const [showCorrectReveal, setShowCorrectReveal] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [pulseKey, setPulseKey] = useState(0);
  const prevCorrectCount = useRef(0);

  // Streak / combo tracking
  const [streak, setStreak] = useState(0);
  const [streakKey, setStreakKey] = useState(0); // force re-animation on increment
  const maxStreakRef = useRef(0); // tracks highest streak across the quiz

  // Persist in-progress answers so users can resume later
  const storageKey = `artifact-quiz:${artifact.id}`;

  // derived values needed by effects
  const finalCompletion = completion ?? localCompletion;
  const isLocked = lockedByServer || alreadyCompleted;

  // Load saved progress
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          if (Array.isArray(parsed.answers) && parsed.answers.length > 0) {
            setAnswers(parsed.answers);
            setCurrentIndex(parsed.currentIndex ?? parsed.answers.length);
            setSelectedIndex(parsed.selectedIndex ?? null);
            setStarted(true);
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }, [storageKey]);

  // Persist progress & notify parent
  useEffect(() => {
    const inProgress =
      !finalCompletion && !isLocked && (started || answers.length > 0 || selectedIndex !== null || currentIndex > 0);
    onInProgressChange?.(!!inProgress);

    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (inProgress) {
        e.preventDefault();
        e.returnValue = "You have an unfinished quiz. Leaving will save progress locally.";
        return e.returnValue;
      }
      return undefined;
    }

    if (typeof window !== "undefined") {
      if (inProgress) window.addEventListener("beforeunload", onBeforeUnload);
      else window.removeEventListener("beforeunload", onBeforeUnload);
    }

    try {
      if (inProgress) {
        const payload = { currentIndex, answers, selectedIndex };
        localStorage.setItem(storageKey, JSON.stringify(payload));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (e) {
      // ignore
    }

    return () => {
      if (typeof window !== "undefined") window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [started, currentIndex, answers, selectedIndex, finalCompletion, isLocked, onInProgressChange, storageKey]);

  const currentQuestion = questions[currentIndex];
  const correctCount = [...answers, ...(selectedIndex === null ? [] : [selectedIndex])].reduce(
    (total, answer, index) => total + (answer === questions[index].correctIndex ? 1 : 0),
    0,
  );
  // Track when a new correct answer is added (avoid spurious confetti)
  useEffect(() => {
    const diff = correctCount - prevCorrectCount.current;
    if (diff > 0) {
      setConfettiKey((k) => k + 1);
    }
    prevCorrectCount.current = correctCount;
  }, [correctCount, selectedIndex]);

  const isCurrentCorrect =
    selectedIndex !== null && selectedIndex === currentQuestion.correctIndex;

  const catMeta = CATEGORY_META[artifact.category as CategoryKey] ?? CATEGORY_META.crafts;

  function handleLockedClick() {
    sfx.error();
  }

  function handleAnswer(index: number) {
    if (selectedIndex !== null || submitting) return;
    setSelectedIndex(index);
    setStarted(true);

    const isCorrect = index === currentQuestion.correctIndex;

    if (isCorrect) {
      // Correct! Increase streak and celebrate
      const newStreak = streak + 1;
      if (newStreak > maxStreakRef.current) maxStreakRef.current = newStreak;
      setStreak(newStreak);
      setStreakKey((k) => k + 1);

      // Play escalating combo sound based on streak
      if (newStreak >= 2) {
        sfx.combo(newStreak);
      } else if (isHardMode) {
        sfx.hardCorrect();
      } else {
        sfx.success();
      }

      setFeedbackType("correct");
      setFeedbackKey((k) => k + 1);
      setPulseKey((k) => k + 1);
      // Show "Next" button after feedback popup fades
      setTimeout(() => setShowNext(true), 700);
    } else {
      // Wrong! Reset streak to 0
      setStreak(0);
      setStreakKey((k) => k + 1);

      if (isHardMode) {
        sfx.hardWrong();
      } else {
        sfx.error();
      }
      setFeedbackType("wrong");
      setFeedbackKey((k) => k + 1);
      // After the wrong feedback settles, reveal the correct answer
      setTimeout(() => {
        setShowCorrectReveal(true);
        setShowNext(true);
      }, 900);
    }
  }

  function handleNext() {
    if (selectedIndex === null) return;

    const nextAnswers = [...answers, selectedIndex];
    const isLast = currentIndex === questions.length - 1;

    // Reset feedback states
    setFeedbackType(null);
    setShowNext(false);
    setShowCorrectReveal(false);

    if (!isLast) {
      // Keep streak across question transitions
      setTransitionDir("out");
      setTimeout(() => {
        setAnswers(nextAnswers);
        setCurrentIndex((v) => v + 1);
        setSelectedIndex(null);
        setSubmitError(null);
        setTransitionDir("in");
      }, 200);
      return;
    }

    // Submit quiz
    const finalCorrectCount = nextAnswers.reduce(
      (total, answer, index) => total + (answer === questions[index].correctIndex ? 1 : 0),
      0,
    );
    const totalQuestions = nextAnswers.length;

    // Track quiz completion for hard mode unlock (normal mode only)
    if (!isHardMode) {
      try {
        const completed = JSON.parse(localStorage.getItem('quiz-scores') || '[]') as number[];
        completed.push(finalCorrectCount);
        localStorage.setItem('quiz-scores', JSON.stringify(completed.slice(-5)));
        // Check unlock condition: 2 quizzes with avg >= 3/5
        if (completed.length >= 2) {
          const recentTwo = completed.slice(-2);
          const avg = recentTwo.reduce((a, b) => a + b, 0) / recentTwo.length;
          if (avg >= 3) {
            localStorage.setItem('hm-unlocked', 'true');
            onHardModeUnlock?.();
          }
        }
      } catch { /* noop */ }
    }

    // Check if the hardest question was answered correctly
    const lastQ = questions[questions.length - 1];
    const lastAns = nextAnswers[nextAnswers.length - 1];
    const hardCorrect = lastQ?.difficulty >= 4 && lastAns === lastQ?.correctIndex;

    setSubmitting(true);
    setSubmitError(null);

    (async () => {
      try {
        const result = (await submitQuiz({
          data: {
            artifactId: artifact.id,
            correctCount: finalCorrectCount,
            totalQuestions: totalQuestions,
            hardCorrect,
            isHardMode: isHardMode,
          },
        })) as ScanResult;

        if (finalCorrectCount === questions.length) {
          if (isHardMode) sfx.hardFanfare();
          else sfx.fanfare();
        } else {
          if (isHardMode) sfx.hardCorrect();
          else sfx.success();
        }

        await qc.invalidateQueries();

        if (result.alreadyScanned && result.quizCorrectCount === null) {
          setLockedByServer(true);
          sfx.error();
        } else {
          setLocalCompletion(result);
          onCompleted?.(result);
        }
        try { localStorage.removeItem(storageKey); } catch { /* noop */ }
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : t("quiz_submit_error"));
        sfx.error();
      } finally {
        setSubmitting(false);
      }
    })();
  }

  /* ── Result screen (completed quiz) ── */
  if (finalCompletion || lockedByServer) {
    if (!finalCompletion) {
      return (
        <section className="animate-in zoom-in-95 game-card overflow-hidden duration-500">
          <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted text-2xl">🔒</div>
            <p className="font-display text-lg text-ink">{t("quiz_locked_hint")}</p>
          </div>
        </section>
      );
    }

    const score = finalCompletion.quizCorrectCount ?? 0;
    const total = finalCompletion.quizTotalQuestions ?? 3;
    const isPerfect = score === total;

    return (
      <section className="relative animate-in zoom-in-95 game-card overflow-hidden duration-500">
        {isPerfect && <ConfettiBurst count={24} />}

        {/* Gradient header */}
        <div className="relative border-b border-border bg-gradient-to-br from-accent to-secondary/60 px-6 py-6">
          <div className="mb-4 flex flex-col items-center text-center">
            <div className="relative mb-4">
              {isPerfect && (
                <>
                  {/* Multi-ring celebration */}
                  <div className="absolute inset-0 animate-ping rounded-full bg-gold/20" />
                  <div
                    className="absolute inset-0 rounded-full bg-gold/10"
                    style={{ animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite", animationDelay: "0.3s" }}
                  />
                </>
              )}
              <div
                className={`relative flex size-20 items-center justify-center rounded-full shadow-lg ${
                  isPerfect
                    ? "bg-gradient-to-br from-gold to-primary text-white bounce-celebrate"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                {isPerfect ? (
                  <div className="flex items-center justify-center">
                    <Star className="absolute size-8 fill-white" />
                    <Sparkles className="size-10" />
                  </div>
                ) : (
                  <CheckCircle2 className="size-10" />
                )}
              </div>
            </div>
            <h3 className="font-display text-2xl text-ink">
              {isPerfect
                ? score > 0
                  ? t("quiz_perfect_title")
                  : t("quiz_result_title")
                : t("quiz_result_title")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isPerfect ? t("quiz_perfect_sub") : score > 0 ? t("quiz_good_sub") : t("quiz_result_title")}
            </p>
          </div>

          {/* Sparkle decorations */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <span className="sparkle absolute left-4 top-6 text-lg" style={{ animationDelay: "0.2s" }}>✦</span>
            <span className="sparkle absolute right-6 top-10 text-sm" style={{ animationDelay: "0.6s" }}>✧</span>
            <span className="sparkle absolute left-10 bottom-8 text-base" style={{ animationDelay: "1s" }}>✦</span>
          </div>
        </div>

        {/* Score cards with animated entrance */}
        <div className="grid grid-cols-2 gap-4 p-6">
          <div className="pop-in rounded-2xl border-2 border-border bg-card p-4 text-center shadow-sm">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("quiz_score")}</p>
            <p className="font-display text-3xl text-ink">
              {score}
              <span className="text-muted-foreground/40">/{total}</span>
            </p>
          </div>
          <div
            className="pop-in rounded-2xl border-2 border-border bg-card p-4 text-center shadow-sm"
            style={{ animationDelay: "0.15s" }}
          >
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("exp_gained")}</p>
            <p className="font-display text-3xl text-primary">+{finalCompletion.expGained}</p>
            {/* Hard question bonus badge */}
            {finalCompletion.hardCorrectBonus && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 animate-in fade-in zoom-in-75 duration-300">
                <Star className="size-2.5" fill="currentColor" />
                Hard bonus +5
              </span>
            )}
          </div>
        </div>

        {/* Max streak badge */}
        {maxStreakRef.current >= 2 && (
          <div className="flex justify-center">
            <div className="pop-in inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold/10 to-primary/10 px-4 py-2 text-sm">
              <span className="text-base">
                {maxStreakRef.current >= 4 ? "💥🔥" : maxStreakRef.current >= 3 ? "🔥🔥" : "🔥"}
              </span>
              <span className="font-display font-semibold text-ink">
                {lang === "bm" ? "Tertinggi" : "Best Streak"}: {maxStreakRef.current}
              </span>
            </div>
          </div>
        )}

        {/* Level-up popup */}
        {finalCompletion.levelUps > 0 && (
          <LevelUpPopup
            level={finalCompletion.level}
            levelUps={finalCompletion.levelUps}
          />
        )}

        {/* Rewards */}
        <div className="border-t border-border bg-accent/30 px-6 pb-6 pt-4 space-y-3">
          {finalCompletion.levelUps > 0 && (
            <div className="pop-in flex items-center gap-3 rounded-xl bg-gold/15 p-3 text-sm font-medium text-amber-700 dark:text-amber-300">
              <TrendingUp className="size-5" />
              <span>{t("level_up")} → Lv. {finalCompletion.level}</span>
            </div>
          )}
          {finalCompletion.newBadges.length > 0 && (
            <div
              className="pop-in flex items-center gap-3 rounded-xl bg-primary/15 p-3 text-sm font-medium text-primary"
              style={{ animationDelay: "0.15s" }}
            >
              <Award className="size-5" />
              <span>{t("new_badge")} {t("badge_earned")}</span>
            </div>
          )}
        </div>
      </section>
    );
  }

  /* ── Active quiz ── */

  return (
    <section className={`relative overflow-hidden rounded-2xl border-2 ${isHardMode ? "border-red-500/20 bg-zinc-950 shadow-lg shadow-red-950/30" : "game-card"}`}>
      {/* Feedback popup overlay */}
      {feedbackType && <FeedbackPopup key={feedbackKey} type={feedbackType} />}

      {/* Gradient header bar with category emoji + streak meter */}
      <div className={`flex items-center gap-3 border-b px-6 py-4 ${isHardMode ? "border-red-900/30 bg-gradient-to-br from-zinc-900 via-zinc-950 to-slate-900" : "border-border bg-gradient-to-br from-accent to-secondary/60"}`}>
        <span
          className="grid size-10 shrink-0 place-items-center rounded-full text-lg wiggle"
          style={{ background: catMeta.bg, color: catMeta.color }}
        >
          {catMeta.emoji}
        </span>
        <div className="min-w-0 flex-1 flex items-center gap-2">            <div className={`flex items-center gap-2 text-sm font-bold uppercase tracking-widest ${isHardMode ? "text-red-400" : "text-primary"}`}>
              {isHardMode ? (
                <>
                  <Skull className="size-4" />
                  {t("hm_quiz_title")}
                </>
              ) : (
                <>
                  <HelpCircle className="size-4" />
                  {t("quiz_title")}
                </>
              )}
            </div>
          {/* Combo meter badge */}
          <ComboMeter streak={streak} animKey={streakKey} />
        </div>
        <span className="chip shrink-0 text-[10px]">
          {currentIndex + 1} / {questions.length}
        </span>
      </div>

      {/* Question area with slide transition */}
      <div className="px-6 pt-6">
        <div
          className={`mb-6 min-h-[4.5rem] ${
            transitionDir === "out"
              ? "question-slide-out"
              : "question-bounce-in"
          }`}
          key={currentIndex + (transitionDir === "in" ? "-in" : "-out")}
        >
          <p className={`text-lg font-semibold leading-snug ${isHardMode ? "text-zinc-100" : "text-ink"}`}>
            {lang === "bm" ? currentQuestion.prompt.bm : currentQuestion.prompt.en}
          </p>
          {/* Difficulty indicator */}
          <div className="mt-2 flex items-center gap-1.5">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((level) => {
                const isFilled = level <= currentQuestion.difficulty;
                const colors = [
                  "text-jungle",
                  "text-indigo",
                  "text-primary",
                  "text-gold",
                  "text-amber-500",
                ];
                return (
                  <Star
                    key={level}
                    className={`size-3 transition-all duration-300 ${
                      isFilled
                        ? `${colors[level - 1]} drop-shadow-sm`
                        : "text-muted-foreground/20"
                    }`}
                    fill={isFilled ? "currentColor" : "none"}
                  />
                );
              })}
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {lang === "bm"
                ? currentQuestion.difficulty <= 2
                  ? "Mudah"
                  : currentQuestion.difficulty <= 4
                    ? "Sederhana"
                    : "Sukar"
                : currentQuestion.difficulty <= 2
                  ? "Easy"
                  : currentQuestion.difficulty <= 4
                    ? "Medium"
                    : "Hard"}
            </span>
          </div>
        </div>

        {/* Option buttons */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            const isCorrect = index === currentQuestion.correctIndex;
            const isSelected = index === selectedIndex;
            const isShaking = isSelected && selectedIndex !== null && !isCurrentCorrect;
            const showState = selectedIndex !== null;
            const showCorrectLater = showCorrectReveal && isCorrect && !isSelected;

            let stateClass: string;
            if (showState && !showCorrectLater) {
              // During feedback display
              if (isCorrect && (isSelected || showCorrectReveal)) {
                // Correct answer (either selected or revealed after wrong)
                stateClass =
                  "border-jungle bg-jungle/15 text-jungle ring-2 ring-jungle/30 shadow-[0_0_12px_-3px_var(--color-jungle)] bounce-celebrate";
              } else if (isSelected && !isCorrect) {
                // Wrong selection
                stateClass =
                  "border-destructive bg-destructive/15 text-destructive ring-2 ring-destructive/20";
              } else {
                // Unselected, not relevant
                stateClass = "border-border bg-card/40 text-muted-foreground opacity-60";
              }
            } else if (showCorrectLater) {
              // Revealing correct answer after wrong selection
              stateClass =
                "border-jungle bg-jungle/15 text-jungle ring-2 ring-jungle/30 shadow-[0_0_12px_-3px_var(--color-jungle)] bounce-celebrate";
            } else {
              stateClass = isHardMode
                ? "border-zinc-700 bg-zinc-900 text-zinc-300 transition-[border-color,background,box-shadow] duration-200 ease-[var(--ease-out)] hover:border-red-500/40 hover:bg-red-950/10 hover:shadow-md"
                : "border-border bg-card transition-[border-color,background,box-shadow] duration-200 ease-[var(--ease-out)] hover:border-primary/50 hover:bg-primary/5 hover:shadow-md";
            }

            // Add shaking to wrong selection
            const shakeClass = isShaking ? "shake-wrong" : "";

            return (
              <button
                key={index}
                type="button"
                disabled={selectedIndex !== null || submitting}
                onClick={() => handleAnswer(index)}
                className={`relative flex w-full items-center justify-between rounded-2xl border-2 px-5 py-4 text-left text-sm font-medium disabled:cursor-default animate-in fade-in slide-in-from-bottom-2 ${stateClass} ${shakeClass}`}
                style={{
                  animationDelay: `${index * 80}ms`,
                  animationFillMode: "both",
                }}
              >
                {/* Pulse ring on correct answer */}
                {showState && isCorrect && (isSelected || showCorrectReveal) && (
                  <PulseRing key={pulseKey} />
                )}

                <span className="flex items-center gap-2">
                  {/* Correct answer sparkle */}
                  {showState && isCorrect && (isSelected || showCorrectReveal) && (
                    <span className="sparkle text-base">✨</span>
                  )}
                  {/* Wrong answer shake icon */}
                  {isShaking && (
                    <span className="text-base">💥</span>
                  )}
                  <span>{lang === "bm" ? option.bm : option.en}</span>
                </span>

                {/* Status icon */}
                {showState && (
                  <>
                    {isCorrect && (isSelected || showCorrectReveal) && (
                      <CheckCircle2 className="size-5 shrink-0 text-jungle animate-in zoom-in-75 duration-200" />
                    )}
                    {isSelected && !isCorrect && (
                      <XCircle className="size-5 shrink-0 text-destructive animate-in zoom-in-75 duration-200" />
                    )}
                    {!isSelected && !isCorrect && showState && (
                      <span className="size-5 shrink-0" />
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress bar + Next button */}
      {(showNext || selectedIndex !== null) && (          <div className={`px-6 pb-6 pt-5 ${isHardMode ? "bg-zinc-950/50" : ""} ${
            showNext ? "animate-in fade-in slide-in-from-bottom-2 duration-300" : ""
          }`}>
          {/* Progress bar matching ExpBar style */}
          <div className="mb-5 flex gap-1">
            {questions.map((_, i) => {
              const answered = i < currentIndex;
              const isCurrent = i === currentIndex;
              const gotCorrect = isCurrent
                ? selectedIndex !== null && selectedIndex === questions[i].correctIndex
                : answered && answers[i] === questions[i].correctIndex;

              let fillPct = 0;
              let fillGrad: string;
              if (answered) {
                fillPct = 100;
                fillGrad = gotCorrect
                  ? "linear-gradient(90deg, oklch(0.72 0.09 165), oklch(0.86 0.1 70))"
                  : "linear-gradient(90deg, oklch(0.68 0.16 25), oklch(0.72 0.14 30))";
              } else if (isCurrent) {
                fillPct = 100;
                fillGrad = gotCorrect
                  ? "linear-gradient(90deg, oklch(0.72 0.09 165), oklch(0.86 0.1 70))"
                  : "linear-gradient(90deg, oklch(0.68 0.16 25), oklch(0.72 0.14 30))";
              } else {
                fillGrad = "none";
              }

              return (
                <div
                  key={i}
                  className={`relative h-2 flex-1 overflow-hidden rounded-full border-2 bg-muted ${
                    isCurrent ? "border-ink/20" : "border-border"
                  }`}
                >
                  {fillPct > 0 && (
                    <div
                      className={`h-full transition-all duration-500 ${
                        gotCorrect ? "pop-in" : ""
                      }`}
                      style={{
                        width: `${fillPct}%`,
                        background: fillGrad,
                        boxShadow:
                          fillPct > 0
                            ? `0 0 8px -2px ${gotCorrect ? "oklch(0.72 0.09 165 / 0.5)" : "oklch(0.68 0.16 25 / 0.4)"}`
                            : "none",
                      }}
                    />
                  )}
                  {isCurrent && (
                    <div
                      className="pointer-events-none absolute inset-0 opacity-40"
                      style={{
                        background:
                          "repeating-linear-gradient(45deg, transparent 0 6px, oklch(1 0 0 / 0.4) 6px 8px)",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Correct/Incorrect counters */}
          {selectedIndex !== null && (
            <div className="mb-3 flex items-center justify-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-jungle">
                <CheckCircle2 className="size-3.5" />
                {correctCount}
              </span>
              <span className="flex items-center gap-1 text-destructive">
                <XCircle className="size-3.5" />
                {currentIndex + 1 - correctCount}
              </span>
            </div>
          )}

          {/* Next / Finish button */}
          {showNext && (
            <button
              type="button"
              onClick={handleNext}
              disabled={submitting}
              className={`bounce-soft flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 font-bold shadow-lg animate-in fade-in slide-in-from-bottom-2 ${
                isHardMode
                  ? "bg-gradient-to-r from-red-700 to-amber-800 text-white shadow-red-900/25 hover:shadow-xl hover:shadow-red-900/30"
                  : "bg-gradient-to-r from-primary to-gold text-primary-foreground shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
              } active:scale-95 disabled:opacity-60 disabled:hover:shadow-lg`}
            >
              {submitting ? (
                <span className="inline-block size-5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              ) : currentIndex === questions.length - 1 ? (
                <>
                  {t("quiz_finish")}
                  <Sparkles className="size-4" />
                </>
              ) : (
                <>
                  {t("quiz_next")}
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          )}
        </div>
      )}

      {submitError && (
        <p className="animate-in fade-in px-6 pb-4 text-center text-xs font-medium text-destructive">
          {submitError}
        </p>
      )}
    </section>
  );
}

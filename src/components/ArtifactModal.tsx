import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  TrendingUp,
  Award,
  Flag,
  AlertTriangle,
  Landmark,
  MapPin,
  Layers,
  ScrollText,
  FileText,
  Image as ImageIcon,
  X,
  HelpCircle,
  ArrowLeft,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { artifactImageUrl } from "@/lib/artifact-images";
import { CATEGORY_META, type CategoryKey } from "@/lib/museum";
import type { ScanResult } from "@/lib/museum.functions";
import { sfx } from "@/lib/sfx";
import { ArtifactQuizSection } from "@/components/ArtifactQuizSection";
import { LevelUpPopup } from "@/components/LevelUpPopup";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

interface Props {
  result: ScanResult;
  onClose: () => void;
}

export function ArtifactModal({ result, onClose }: Props) {
  const { t, lang } = useI18n();
  const [showQuiz, setShowQuiz] = useState(false);
  const [localResult, setLocalResult] = useState<ScanResult>(result);
  const [quizInProgress, setQuizInProgress] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [hardMode, setHardMode] = useState(false);

  // Sync hard mode from localStorage
  useEffect(() => {
    const unlocked = localStorage.getItem('hm-unlocked') === 'true';
    const active = localStorage.getItem('hm-active') === 'true';
    setHardMode(unlocked && active);
  }, []);

  // Show level-up popup when the result has levelUps
  useEffect(() => {
    if (localResult.levelUps > 0) {
      setShowLevelUp(true);
    }
  }, [localResult.levelUps]);

  // Sync state when result prop changes (e.g. clicking different pins on map)
  useEffect(() => {
    setLocalResult(result);
    setShowQuiz(false);
  }, [result]);

  const a = localResult.artifact;
  const cat = a.category as CategoryKey;
  const meta = CATEGORY_META[cat];

  const name = lang === "bm" ? a.name_bm : a.name_en;
  const desc = lang === "bm" ? a.description_bm : a.description_en;
  const era = lang === "bm" ? a.era_bm : a.era_en;
  const origin = lang === "bm" ? a.origin_bm : a.origin_en;
  const material = lang === "bm" ? a.material_bm : a.material_en;

  const quizDone = localResult.quizCorrectCount !== null && localResult.quizCorrectCount !== undefined;

  const imageUrl = artifactImageUrl(a.id, a.image_url);
  const gallery: string[] = imageUrl ? [imageUrl] : [];
  const total = gallery.length;

  const [api, setApi] = useState<CarouselApi | null>(null);
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightbox]);

  useEffect(() => {
    if (!api) return;
    const update = () => setIndex(api.selectedScrollSnap());
    update();
    api.on("select", update);
    const autoplay = total > 1 ? setInterval(() => api.scrollNext(), 3200) : null;
    return () => {
      api.off("select", update);
      if (autoplay) clearInterval(autoplay);
    };
  }, [api, total]);

  const uq = localResult.uniqueQuest;

  const specs: { label: string; value: string; icon: React.ReactNode }[] = [];
  if (era)
    specs.push({ label: t("era"), value: era, icon: <ScrollText className="h-3.5 w-3.5" /> });
  if (origin)
    specs.push({ label: t("origin"), value: origin, icon: <MapPin className="h-3.5 w-3.5" /> });
  if (material)
    specs.push({ label: t("material"), value: material, icon: <Layers className="h-3.5 w-3.5" /> });

  function handleLockedQuizClick() {
    sfx.error();
  }

  function confirmIfInProgress(action: () => void) {
    if (quizInProgress) {
      const ok = window.confirm("You have an unfinished quiz. Leave and resume later? Your progress will be saved locally.");
      if (!ok) return;
    }
    action();
  }

  return (
    <Dialog open onOpenChange={(v) => {
      if (!v) {
        confirmIfInProgress(() => onClose());
      }
    }}>
      <DialogContent 
        className={`max-h-[90vh] overflow-y-auto rounded-[28px] border-2 border-border bg-card transition-[max-width] duration-300 ease-[var(--ease-out)] ${
          showQuiz ? "max-w-6xl" : "max-w-3xl"
        }`}
      >
        <div className={`flex flex-col gap-6 lg:flex-row ${showQuiz ? "lg:items-start" : ""}`}>
          <div className={`flex-1 space-y-6 ${showQuiz ? "hidden" : ""}`}>
            <DialogHeader>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{ borderColor: meta.color, color: meta.color }}
                >
                  {meta.emoji} {t(`category_${cat}` as never)}
                </span>
              </div>
              <DialogTitle className="pr-8 text-2xl font-semibold tracking-tight">{name}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-3 pt-1 text-sm">
                <span className="flex items-center gap-1">
                  <Landmark className="h-3.5 w-3.5" /> {origin || t("museum")}
                </span>
                {era && <span className="tabular-nums font-medium text-foreground">{era}</span>}
              </DialogDescription>
            </DialogHeader>

            {/* Gallery */}
            {total > 0 ? (
              <div className="space-y-2">
                <Carousel setApi={setApi} opts={{ loop: true }} className="w-full">
                  <CarouselContent>
                    {gallery.map((src, i) => (
                      <CarouselItem key={`${src}-${i}`}>
                        <button
                          type="button"
                          onClick={() => setLightbox(src)}
                          aria-label={`${name} – ${t("inspect_image")}`}
                          className="group grid aspect-[4/3] w-full cursor-zoom-in place-items-center overflow-hidden rounded-xl transition-transform duration-200 ease-[var(--ease-out)] hover:scale-[1.03]"
                          style={{ background: meta.bg }}
                        >
                          <img
                            src={src}
                            alt={`${name} – ${i + 1}`}
                            className="h-full w-full object-contain p-2 drop-shadow-xl transition-transform duration-200 ease-[var(--ease-out)] group-hover:scale-[1.05]"
                            loading="lazy"
                          />
                        </button>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {total > 1 && (
                    <>
                      <CarouselPrevious className="left-2 z-10 bg-background/80 backdrop-blur" />
                      <CarouselNext className="right-2 z-10 bg-background/80 backdrop-blur" />
                    </>
                  )}
                </Carousel>
                <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ImageIcon className="h-3 w-3" />
                    {name}
                  </span>
                  <span>
                    {index + 1} / {total}
                  </span>
                </div>
              </div>
            ) : (
              <div
                className="grid aspect-[16/10] place-items-center rounded-xl text-6xl opacity-30"
                style={{ background: meta.bg }}
              >
                {meta.emoji}
              </div>
            )}

            {/* Specs */}
            {specs.length > 0 && (
              <div className="rounded-xl border border-border bg-secondary/30 p-4">
                <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                  <FileText className="h-3 w-3" /> {t("visit_summary")}
                </div>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  {specs.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-3 border-b border-border/40 py-1 last:border-0 sm:border-0 sm:py-0"
                    >
                      <dt className="flex items-center gap-1.5 text-muted-foreground">
                        {row.icon}
                        <span>{row.label}</span>
                      </dt>
                      <dd className="font-medium text-foreground">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Story / description */}
            <div className="rounded-xl border border-border bg-accent/30 p-4">
              <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                <Sparkles className="h-3 w-3" /> {name}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">{desc}</p>
            </div>

            {/* Reward strip */}
            <div className="rounded-xl border-2 border-border bg-card/30 p-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p
                    className={`font-display text-3xl ${
                      localResult.expGained < 0 ? "text-destructive" : "text-primary"
                    }`}
                  >
                    {localResult.expGained >= 0 ? "+" : ""}
                    {localResult.expGained} EXP {localResult.expGained >= 0 ? "✨" : "💥"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("total_exp")}: <span className="font-display text-ink">{localResult.totalExp}</span>
                  </p>
                </div>
                {uq?.kind === "activeCorrect" && (
                  <p className="flex items-center gap-2 text-sm text-jungle">
                    <Sparkles className="size-4" /> {t("uq_correct_bonus")} · {uq.correctScans}/
                    {uq.targetCount}
                  </p>
                )}
                {uq?.kind === "activeCorrectComplete" && (
                  <p className="flex items-center gap-2 text-sm text-jungle">
                    <Flag className="size-4" /> {t("quest_done")}!
                  </p>
                )}
                {uq?.kind === "activeWrongFail" && (
                  <p className="flex items-center gap-2 text-sm text-destructive">
                    <AlertTriangle className="size-4" /> {t("uq_wrong_penalty")}
                  </p>
                )}
                {localResult.levelUps > 0 && (
                  <p className="flex items-center gap-2 text-sm">
                    <TrendingUp className="size-4 text-gold" /> {t("level_up")} → Lv. {localResult.level}{" "}
                    (+{localResult.pointsGained} {t("points")})
                  </p>
                )}
                {localResult.newBadges.length > 0 && (
                  <p className="flex items-center gap-2 text-sm">
                    <Award className="size-4 text-primary" /> {t("new_badge")}:{" "}
                    {localResult.newBadges.length}
                  </p>
                )}
                {localResult.newAchievements.length > 0 && (
                  <p className="flex items-center gap-2 text-sm">
                    <Sparkles className="size-4 text-indigo" /> {t("new_achievement")}:{" "}
                    {localResult.newAchievements.length}
                  </p>
                )}
              </div>
            </div>

            {/* Quiz Button Section */}
            {!showQuiz && (
              <div className="pt-2">
                {quizDone ? (
                  <button
                    type="button"
                    onClick={handleLockedQuizClick}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-border bg-muted/50 px-6 py-4 text-sm font-bold text-muted-foreground transition-colors duration-150"
                  >
                    <HelpCircle className="size-5" />
                    {t("quiz_answered")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuiz(true);
                      sfx.pop();
                    }}
                    className="flex w-full bounce-soft items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-colors duration-150 hover:bg-primary/90"
                  >
                    <HelpCircle className="size-5" />
                    {t("quiz_cta")}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quiz Panel (Right Side) */}
          {showQuiz && (
            <div className="flex-1 animate-in fade-in slide-in-from-right-8 duration-300 lg:min-h-[500px]">
              <div className="sticky top-0 h-full">
                <ArtifactQuizSection 
                  artifact={a}
                  alreadyCompleted={quizDone}
                  completion={localResult.quizCorrectCount !== null ? localResult : null}
                  onCompleted={(res) => {
                    setLocalResult(res);
                  }}
                  onInProgressChange={(v) => setQuizInProgress(v)}
                  hardMode={hardMode}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (quizInProgress) {
                      const ok = window.confirm("You have an unfinished quiz. Leave and resume later? Your progress will be saved locally.");
                      if (!ok) return;
                    }
                    setShowQuiz(false);
                  }}
                  className="mt-4 flex w-full items-center justify-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="size-3" /> {t("back")}
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
      {/* Level-up popup overlay */}
      {showLevelUp && localResult.levelUps > 0 && (
        <LevelUpPopup
          level={localResult.level}
          levelUps={localResult.levelUps}
          onClose={() => setShowLevelUp(false)}
        />
      )}
      {lightbox &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("inspect_image")}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightbox(null);
              }}
              aria-label={t("close")}
              className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/10 text-white transition-colors duration-150 hover:bg-white/20 active:scale-95"
            >
              <X className="size-5" />
            </button>
            <img
              src={lightbox}
              alt={name}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[92vh] max-w-[95vw] cursor-zoom-out rounded-xl object-contain shadow-2xl"
            />
          </div>,
          document.body,
        )}
    </Dialog>
  );
}

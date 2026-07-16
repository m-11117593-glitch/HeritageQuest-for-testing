import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { ArrowLeft, Check, Sparkles, Flag, Award, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { artifactImageUrl } from "@/lib/artifact-images";
import { scanArtifact, type ScanResult } from "@/lib/museum.functions";
import { sfx } from "@/lib/sfx";
import { ArtifactQuizSection } from "@/components/ArtifactQuizSection";
import { LevelUpPopup } from "@/components/LevelUpPopup";

export const Route = createFileRoute("/_authenticated/artifact/$id")({
  component: ArtifactPage,
});

async function fetchArtifact(id: string) {
  try {
    console.log(`[artifact.$id] fetchArtifact called with id=`, id);
    const [{ data: artifact }, { data: mine }] = await Promise.all([
      supabase.from("artifacts").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("user_artifact_progress")
        .select("*")
        .eq("artifact_id", id)
        .maybeSingle(),
    ]);
    console.log(`[artifact.$id] fetchArtifact result artifact=`, artifact ? artifact.id : null, ", mine=", mine ? "present" : null);
    return { artifact, mine };
  } catch (err) {
    console.error('[artifact.$id] fetchArtifact error:', err);
    return { artifact: null, mine: null };
  }
}

function ArtifactPage() {
  const { id } = Route.useParams();
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const router = useRouter();
  const scanFn = useServerFn(scanArtifact);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [hardMode, setHardMode] = useState(false);

  // Sync hard mode from localStorage after hydration (SSR-safe)
  useEffect(() => {
    setHardMode(
      localStorage.getItem('hm-active') === 'true'
    );
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["artifact", id],
    queryFn: () => fetchArtifact(id),
  });
  const artifact = data?.artifact;
  const progress = data?.mine;
  const alreadyClaimed = !!progress;
  const quizDone = progress?.quiz_correct_count !== null && progress?.quiz_correct_count !== undefined;

  async function claim() {
    setBusy(true);
    try {
      const res = (await scanFn({ data: { artifactId: id } })) as ScanResult;
      setResult(res);
      if (!res.levelUps) sfx.success();
      if (res.newBadges.length > 0) setTimeout(() => sfx.coin(), 400);
      qc.invalidateQueries();
      router.invalidate();
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">…</p>;
  if (!artifact && typeof window === 'undefined') return <p className="text-sm text-muted-foreground">…</p>;
  if (!artifact) return <p className="text-sm">Not found.</p>;

  const name = lang === "bm" ? artifact.name_bm : artifact.name_en;
  const desc = lang === "bm" ? artifact.description_bm : artifact.description_en;
  const era = lang === "bm" ? artifact.era_bm : artifact.era_en;
  const origin = lang === "bm" ? artifact.origin_bm : artifact.origin_en;
  const material = lang === "bm" ? artifact.material_bm : artifact.material_en;
  const imageUrl = artifactImageUrl(artifact.id, artifact.image_url);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to="/map"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-ink"
      >
        <ArrowLeft className="size-4" /> {t("back")}
      </Link>

      <article className={`overflow-hidden rounded-2xl ${hardMode ? "hm-card-bg hm-ambient-glow hm-red-border shadow-lg shadow-cyan-500/20" : "paper-card"}`}>
        {/* Cute rounded header — darker gradient for hard mode */}
        <div className={`relative border-b px-6 py-8 ${hardMode ? "hm-header-bg" : "border-border bg-gradient-to-br from-accent to-secondary"}`}>
          <div className="absolute inset-x-4 top-4 flex justify-between text-xs uppercase tracking-[0.35em] text-muted-foreground">
            <span>{t("tagline")}</span>
            <span>№ {artifact.sort_order.toString().padStart(3, "0")}</span>
          </div>
          <p className={`mt-6 text-base font-semibold uppercase tracking-[0.3em] ${hardMode ? "text-cyan-400 hm-cyan-glow" : "text-primary"}`}>
            {t(`category_${artifact.category}` as never)}
          </p>
          <h1 className={`mt-2 font-display text-4xl leading-tight ${hardMode ? "text-zinc-800" : "text-ink"}`}>{name}</h1>
        </div>

        {imageUrl && (
          <div className={`border-b px-6 py-5 ${hardMode ? "border-cyan-800/20 bg-white/40" : "border-border bg-card"}`}>
            <div className={`grid aspect-[16/10] place-items-center overflow-hidden rounded-2xl ${hardMode ? "bg-white/30" : "bg-accent/40"}`}>
              <img
                src={imageUrl}
                alt={name}
                className="h-full w-full object-contain p-4"
                loading="eager"
                width={960}
                height={600}
              />
            </div>
          </div>
        )}

        <div className="grid gap-6 p-6 md:grid-cols-3">
          <dl className="space-y-3 md:col-span-1">
            <div>
              <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("era")}
              </dt>
              <dd className={`font-display text-2xl ${hardMode ? "text-zinc-700" : "text-ink"}`}>{era}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("origin")}
              </dt>
              <dd className={`font-display text-2xl ${hardMode ? "text-zinc-700" : "text-ink"}`}>{origin}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-widest text-muted-foreground">
                {t("material")}
              </dt>
              <dd className={`font-display text-2xl ${hardMode ? "text-zinc-700" : "text-ink"}`}>{material}</dd>
            </div>
          </dl>
          <p className={`text-lg leading-relaxed ${hardMode ? "text-zinc-800" : "text-foreground/90"} md:col-span-2`}>{desc}</p>
        </div>

        <div className={`border-t p-6 ${hardMode ? "border-cyan-800/20 bg-white/40" : "border-border bg-accent/40"}`}>
          {result ? (
            <RewardSummary result={result} />
          ) : quizDone ? (
            <div className="space-y-4">
              <div className={`flex items-center gap-2 text-base ${hardMode ? "text-cyan-800" : "text-jungle"}`}>
                <Check className="size-5" />
                {t("already_claimed")} · +{progress?.exp_earned} EXP
              </div>
              <div className={`rounded-2xl border-2 p-4 ${hardMode ? "border-cyan-800/30 bg-white/30" : "border-primary/20 bg-card"}`}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">{t("quiz_score")}</p>
                <p className={`font-display text-2xl ${hardMode ? "text-zinc-800" : "text-ink"}`}>{progress?.quiz_correct_count}/{progress?.quiz_total_questions}</p>
              </div>
            </div>
          ) : alreadyClaimed ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-base text-jungle">
                <Check className="size-5" />
                {t("scanned")} · +{progress?.exp_earned} EXP
              </div>
              <ArtifactQuizSection 
                artifact={artifact} 
                alreadyCompleted={false}
                completion={null}
                onCompleted={setResult}
                hardMode={hardMode}
                onHardModeUnlock={() => {
                  // Hard mode unlock handled via localStorage; next quizzes page visit shows popup
                }}
              />
            </div>
          ) : (
            <button
              onClick={claim}
              disabled={busy}
              className="bounce-soft inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-md disabled:opacity-60"
            >
              <Sparkles className="size-4" />
              {busy ? "…" : t("claim_exp")}
            </button>
          )}
        </div>
      </article>
    </div>
  );
}

function RewardSummary({ result }: { result: ScanResult }) {
  const { t, lang } = useI18n();
  return (
    <>
      {result.levelUps > 0 && (
        <LevelUpPopup
          level={result.level}
          levelUps={result.levelUps}
        />
      )}
      <div className="space-y-3 pop-in">
        <p className="font-display text-3xl text-primary">
          +{result.expGained} {t("exp")} ✨
        </p>
        {result.levelUps > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="size-4 text-gold" />
            {t("level_up")} → Lv. {result.level} (+{result.pointsGained} {t("points")})
          </div>
        )}
      {result.newQuests.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Flag className="size-4 text-jungle" />
          {t("quest_done")}: {result.newQuests.length}
        </div>
      )}
      {result.newBadges.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Award className="size-4 text-primary" />
          {t("new_badge")}: {result.newBadges.length}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {lang === "bm"
          ? "Rekod telah disimpan. Kembali ke peta."
          : "Recorded. Head back to the map."}
      </p>
    </div>
    </>
  );
}

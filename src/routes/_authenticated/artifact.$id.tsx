import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
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
  // DEBUG: log artifact fetch attempts to help diagnose 404 from quiz navigation
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
    // Swallow errors during client-side fetch so the UI can show a friendly Not found
    // message instead of an unhandled exception that triggers the app error boundary.
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
      // LevelUpPopup handles the level-up sound separately
      if (!res.levelUps) sfx.success();
      if (res.newBadges.length > 0) setTimeout(() => sfx.coin(), 400);
      qc.invalidateQueries();
      router.invalidate();
    } finally {
      setBusy(false);
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">…</p>;
  // If rendering on the server (no window) and the artifact isn't present yet, show a neutral loading
  // placeholder instead of a definitive "Not found". The server-side Supabase client may not have
  // the user's auth session and could return null; let the client re-check after hydration.
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

      <article className="paper-card overflow-hidden">
        {/* Cute rounded header */}
        <div className="relative border-b border-border bg-gradient-to-br from-accent to-secondary px-6 py-8">
          <div className="absolute inset-x-4 top-4 flex justify-between text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
            <span>{t("tagline")}</span>
            <span>№ {artifact.sort_order.toString().padStart(3, "0")}</span>
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
            {t(`category_${artifact.category}` as never)}
          </p>
          <h1 className="mt-2 font-display text-4xl leading-tight text-ink">{name}</h1>
        </div>

        {imageUrl && (
          <div className="border-b border-border bg-card px-6 py-5">
            <div className="grid aspect-[16/10] place-items-center overflow-hidden rounded-2xl bg-accent/40">
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
          <dl className="space-y-3 text-sm md:col-span-1">
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("era")}
              </dt>
              <dd className="font-display text-base">{era}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("origin")}
              </dt>
              <dd className="font-display text-base">{origin}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("material")}
              </dt>
              <dd className="font-display text-base">{material}</dd>
            </div>
          </dl>
          <p className="text-base leading-relaxed text-foreground/90 md:col-span-2">{desc}</p>
        </div>

        <div className="border-t border-border bg-accent/40 p-6">
          {result ? (
            <RewardSummary result={result} />
          ) : quizDone ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-jungle">
                <Check className="size-4" />
                {t("already_claimed")} · +{progress?.exp_earned} EXP
              </div>
              <div className="rounded-2xl border-2 border-primary/20 bg-card p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">{t("quiz_score")}</p>
                <p className="font-display text-2xl text-ink">{progress?.quiz_correct_count}/{progress?.quiz_total_questions}</p>
              </div>
            </div>
          ) : alreadyClaimed ? (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm text-jungle">
                <Check className="size-4" />
                {t("scanned")} · +{progress?.exp_earned} EXP
              </div>
              <ArtifactQuizSection 
                artifact={artifact} 
                alreadyCompleted={false}
                completion={null}
                onCompleted={setResult}
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

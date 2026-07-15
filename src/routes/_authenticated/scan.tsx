import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { QrScannerBox } from "@/components/QrScannerBox";
import { ArtifactModal } from "@/components/ArtifactModal";
import { UniqueQuestOffer } from "@/components/UniqueQuestOffer";
import { scanArtifact, type ScanResult } from "@/lib/museum.functions";
import { useI18n } from "@/lib/i18n";
import { sfx } from "@/lib/sfx";

export const Route = createFileRoute("/_authenticated/scan")({
  component: ScanPage,
});

function ScanPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const scanFn = useServerFn(scanArtifact);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showOffer, setShowOffer] = useState(false);

  async function handleScan(id: string) {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const res = (await scanFn({ data: { artifactId: id } })) as ScanResult;
      // sfx by outcome — LevelUpPopup handles level-up sound separately
      if (res.expGained < 0) sfx.fail();
      else if (res.uniqueQuest?.kind === "activeCorrectComplete") sfx.fanfare();
      else if (!res.levelUps) sfx.success();
      if (res.newBadges.length) setTimeout(() => sfx.coin(), 400);
      setResult(res);
      qc.invalidateQueries();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes("ARTIFACT_NOT_FOUND") ? t("scan_not_found") : msg);
      sfx.error();
    } finally { setBusy(false); }
  }

  function closeArtifact() {
    // if there's an offer waiting, show it next
    if (result?.offeredUniqueQuest) { setShowOffer(true); setResult((r) => r ? { ...r } : r); }
    else setResult(null);
  }

  return (
    <div className="space-y-4">
      <header className="text-center">
        <h1 className="font-display text-3xl">{t("scan_title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("scan_hint")}</p>
      </header>

      <QrScannerBox onScan={handleScan} />
      {error && <p className="mx-auto max-w-lg rounded-2xl border-2 border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive shake">{error}</p>}
      {busy && <p className="text-center text-xs text-muted-foreground">…</p>}

      {result && !showOffer && <ArtifactModal result={result} onClose={closeArtifact} />}
      {result && showOffer && result.offeredUniqueQuest && (
        <UniqueQuestOffer offer={result.offeredUniqueQuest} onClose={() => { setShowOffer(false); setResult(null); }} />
      )}
    </div>
  );
}

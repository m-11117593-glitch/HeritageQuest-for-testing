import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Sparkles, AlertTriangle, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { acceptUniqueQuest, declineUniqueQuest } from "@/lib/museum.functions";
import { CATEGORY_META, type CategoryKey } from "@/lib/museum";
import { sfx } from "@/lib/sfx";
import type { ScanResult } from "@/lib/museum.functions";

interface Props { offer: NonNullable<ScanResult["offeredUniqueQuest"]>; onClose: () => void }

export function UniqueQuestOffer({ offer, onClose }: Props) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const accept = useServerFn(acceptUniqueQuest);
  const decline = useServerFn(declineUniqueQuest);
  const cat = offer.target_category as CategoryKey;
  const meta = CATEGORY_META[cat] ?? { emoji: "📦", color: "oklch(0.55 0.04 260)", bg: "oklch(0.94 0.02 260)" };
  const name = lang === "bm" ? offer.name_bm : offer.name_en;
  const desc = lang === "bm" ? offer.description_bm : offer.description_en;

  async function onAccept() {
    setBusy(true);
    try { await accept({ data: { templateId: offer.templateId } }); sfx.fanfare(); qc.invalidateQueries(); onClose(); } finally { setBusy(false); }
  }
  async function onDecline() {
    setBusy(true);
    try { await decline({ data: { templateId: offer.templateId } }); sfx.tap(); qc.invalidateQueries(); onClose(); } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/70 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border-2 border-gold bg-card shadow-2xl pop-in">
        <div className="relative p-6 text-center" style={{ background: `linear-gradient(180deg, ${meta.bg}, transparent)` }}>
          <button onClick={onClose} className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-card/80"><X className="size-4" /></button>
          <div className="mx-auto mb-3 grid size-16 place-items-center rounded-full text-3xl shadow-lg wiggle" style={{ background: meta.color, color: "white" }}>
            {meta.emoji}
          </div>
          <p className="chip mx-auto w-fit border-gold text-gold-foreground bg-gold/30">
            <Sparkles className="size-3" /> {t("uq_offer_title")}
          </p>
          <h3 className="mt-3 font-display text-2xl">{name}</h3>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">{desc}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 border-y border-border bg-accent/30 px-5 py-4 text-center">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("uq_reward")}</p>
            <p className="font-display text-lg text-jungle">×{offer.reward_multiplier} EXP</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("uq_penalty")}</p>
            <p className="font-display text-lg text-destructive">−{offer.penalty_exp} EXP</p>
          </div>
        </div>

        <div className="flex items-start gap-2 bg-destructive/5 px-5 py-3 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{t("uq_warn")}</span>
        </div>

        <div className="flex gap-2 p-4">
          <button
            onClick={onDecline}
            disabled={busy}
            className="bounce-soft flex-1 rounded-full border-2 border-border bg-card px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >{t("uq_decline")}</button>
          <button
            onClick={onAccept}
            disabled={busy}
            className="bounce-soft flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md disabled:opacity-50"
          >{t("uq_accept")}</button>
        </div>
      </div>
    </div>
  );
}

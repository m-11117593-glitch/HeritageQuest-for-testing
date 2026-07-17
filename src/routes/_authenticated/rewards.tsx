import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Gift, Mail, Ticket, Percent, Shirt, Magnet, Check, Info, Coins, Sparkles, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type StringKey } from "@/lib/i18n";
import { redeemSouvenir } from "@/lib/museum.functions";
import { sfx } from "@/lib/sfx";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

export const Route = createFileRoute("/_authenticated/rewards")({
  component: RewardsPage,
});

const ICONS: Record<string, typeof Gift> = {
  gift: Gift, mail: Mail, ticket: Ticket, percent: Percent, shirt: Shirt, magnet: Magnet,
};

const HOVER_KEY: Record<string, StringKey> = {
  "gift-card":   "reward_hover_gift_card",
  "discount-15": "reward_hover_disc15",
  "discount-30": "reward_hover_disc30",
  "poskad":      "reward_hover_poskad",
  "magnet":      "reward_hover_magnet",
  "baju-t":      "reward_hover_tshirt",
};

async function fetchRewards() {
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData.user?.id;
  const [{ data: souvenirs }, { data: prog }, { data: reds }] = await Promise.all([
    supabase.from("souvenirs").select("*").order("sort_order"),
    supabase.from("user_progress").select("discount_points").eq("user_id", uid ?? "").maybeSingle(),
    supabase.from("redemptions").select("souvenir_id, redeemed_at").eq("user_id", uid ?? "").order("redeemed_at", { ascending: false }),
  ]);
  return { souvenirs: souvenirs ?? [], balance: prog?.discount_points ?? 0, redemptions: reds ?? [] };
}

function RewardsPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const redeem = useServerFn(redeemSouvenir);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ id: string; kind: "ok" | "err" } | null>(null);
  const [justRedeemed, setJustRedeemed] = useState<string | null>(null);

  const { data } = useQuery({ queryKey: ["rewards"], queryFn: fetchRewards });

  async function onRedeem(id: string) {
    setBusyId(id); setFlash(null);
    try {
      const res = await redeem({ data: { souvenirId: id } });
      setFlash({ id, kind: res.ok ? "ok" : "err" });
      if (res.ok) {
        sfx.coin();
        setJustRedeemed(id);
        setTimeout(() => setJustRedeemed(null), 2000);
      } else {
        sfx.error();
      }
      qc.invalidateQueries();
    } finally { setBusyId(null); setTimeout(() => setFlash(null), 2500); }
  }

  const souvenirs = data?.souvenirs ?? [];
  const balance = data?.balance ?? 0;

  // Find next affordable souvenir
  const sortedByCost = [...souvenirs].sort((a, b) => a.cost_points - b.cost_points);
  const nextAffordable = sortedByCost.find((s) => s.cost_points > balance);
  const pointsToNext = nextAffordable ? nextAffordable.cost_points - balance : 0;
  const maxCost = souvenirs.length > 0 ? Math.max(...souvenirs.map((s) => s.cost_points)) : 1;
  const overallProgress = Math.min(100, Math.round((balance / maxCost) * 100));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{t("nav_rewards")}</p>
        <h1 className="font-display text-3xl">{t("nav_rewards")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("rewards_intro")}</p>
      </header>

      {/* Balance card with progress */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75 game-card overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-amber-50 to-indigo-50 p-5 dark:from-primary/5 dark:via-amber-950/20 dark:to-indigo-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("balance")}</p>
              <div className="mt-1 flex items-center gap-2">
                <Coins className="size-6 text-amber-500" />
                <p className="font-display text-4xl text-primary tabular-nums">{balance}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("progress")}</p>
              <p className="mt-1 font-display text-lg text-amber-600 dark:text-amber-400">{overallProgress}%</p>
            </div>
          </div>
          {/* Overall progress bar */}
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/50 dark:bg-black/30">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-amber-400 to-indigo-400 transition-all duration-1000 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
          {nextAffordable && pointsToNext > 0 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Sparkles className="size-3 text-amber-500" />
              {lang === "bm"
                ? `${pointsToNext} mata lagi untuk ${nextAffordable.name_bm}`
                : `${pointsToNext} more points to ${nextAffordable.name_en}`
              }
            </p>
          )}
        </div>
      </div>

      {/* Souvenirs grid */}
      <ul className="grid gap-4 sm:grid-cols-2">
        {(souvenirs ?? []).map((s, idx) => {
          const Icon = ICONS[s.icon] ?? Gift;
          const affordable = balance >= s.cost_points;
          const isBusy = busyId === s.id;
          const hoverKey = HOVER_KEY[s.id];
          const isJustRedeemed = justRedeemed === s.id;
          const progressPct = Math.min(100, Math.round((balance / s.cost_points) * 100));

          return (
            <li
              key={s.id}
              className={`game-card group overflow-hidden transition-all duration-300 ease-[var(--ease-out)] ${
                isJustRedeemed
                  ? "ring-2 ring-jungle shadow-lg shadow-jungle/20"
                  : affordable
                    ? "hover:-translate-y-1 hover:shadow-lg"
                    : "opacity-70 hover:-translate-y-0.5"
              }`}
              style={{ animationDelay: `${150 + idx * 80}ms` }}
            >
              <div className="flex items-center gap-4 p-5">
                <div
                  className={`grid size-16 shrink-0 place-items-center rounded-2xl transition-all duration-300 ${
                    affordable
                      ? "bg-gradient-to-br from-primary/20 to-amber-100 dark:from-primary/20 dark:to-amber-900/30"
                      : "bg-accent"
                  } group-hover:scale-105 group-hover:-rotate-3`}
                >
                  <Icon className={`size-7 ${affordable ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className={`truncate font-display text-lg ${affordable ? "" : "text-muted-foreground"}`}>
                      {lang === "bm" ? s.name_bm : s.name_en}
                    </h3>
                    {hoverKey && (
                      <HoverCard openDelay={80} closeDelay={80}>
                        <HoverCardTrigger asChild>
                          <button
                            type="button"
                            aria-label="details"
                            onMouseEnter={() => sfx.tap()}
                            className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                          >
                            <Info className="size-3.5" />
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent side="top" align="start" className="w-64 border-2 border-border bg-card">
                          <div className="flex items-start gap-2">
                            <Icon className="mt-0.5 size-4 text-primary" />
                            <p className="text-xs leading-relaxed text-foreground/85">
                              {t(hoverKey)}
                            </p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    )}
                  </div>
                  {/* Cost and points progress */}
                  <div className="mt-2 flex items-center gap-2">
                    <Coins className={`size-3.5 ${affordable ? "text-amber-500" : "text-muted-foreground"}`} />
                    <span className={`text-sm font-semibold tabular-nums ${affordable ? "text-primary" : "text-muted-foreground"}`}>
                      {s.cost_points}
                    </span>
                    {!affordable && (
                      <div className="flex-1">
                        <div className="h-1.5 overflow-hidden rounded-full bg-accent">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700 ease-out"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  {flash?.id === s.id && flash.kind === "ok" && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-jungle">
                      <Check className="size-3" />
                      {t("redeemed")}
                    </p>
                  )}
                  {flash?.id === s.id && flash.kind === "err" && (
                    <p className="mt-1 text-xs text-destructive">{t("insufficient")}</p>
                  )}
                </div>
                <button
                  disabled={!affordable || isBusy}
                  onClick={() => onRedeem(s.id)}
                  className={`bounce-soft shrink-0 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-150 ease-[var(--ease-out)] active:scale-95 disabled:opacity-40 disabled:active:scale-100 ${
                    affordable
                      ? "bg-gradient-to-r from-primary to-indigo-500 text-primary-foreground shadow-md hover:shadow-lg"
                      : "bg-accent text-muted-foreground"
                  }`}
                >
                  {isBusy ? (
                    <span className="inline-block animate-spin">⟳</span>
                  ) : isJustRedeemed ? (
                    <span className="flex items-center gap-1">
                      <Check className="size-4" />
                      {t("done")}
                    </span>
                  ) : (
                    t("redeem")
                  )}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Redemption history */}
      {data && data.redemptions.length > 0 && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg">
            <Clock className="size-5 text-muted-foreground" />
            {lang === "bm" ? "Sejarah Tebusan" : "Redemption History"}
          </h2>
          <div className="space-y-1.5">
            {data.redemptions.slice(0, 10).map((r, i) => {
              const s = data.souvenirs.find((x) => x.id === r.souvenir_id);
              return (
                <div
                  key={i}
                  className="flex items-center gap-2.5 rounded-xl bg-accent/50 px-4 py-2.5 text-sm text-muted-foreground"
                  style={{ animationDelay: `${350 + i * 50}ms` }}
                >
                  <div className="grid size-7 shrink-0 place-items-center rounded-full bg-jungle/10">
                    {s && ICONS[s.icon] ? (
                      <Check className="size-3.5 text-jungle" />
                    ) : (
                      <Check className="size-3.5 text-jungle" />
                    )}
                  </div>
                  <span className="flex-1">
                    {s ? (lang === "bm" ? s.name_bm : s.name_en) : r.souvenir_id}
                  </span>
                  <span className="text-xs">
                    {new Date(r.redeemed_at).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

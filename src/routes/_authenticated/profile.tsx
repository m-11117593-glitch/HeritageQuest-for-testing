import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Award, Gift, Scroll, ArrowRight, Coins, MapPin, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { ExpBar } from "@/components/ExpBar";
import { BadgeMedallion } from "@/components/BadgeMedallion";
import { resolveAchievementIcon } from "@/lib/utils";
import { TOTAL_ARTIFACTS, expToNextLevel, type Rarity } from "@/lib/museum";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { sfx } from "@/lib/sfx";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

async function fetchProfile() {
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData.user?.id;
  const [{ data: profile }, { data: prog }, { data: scanned }, { data: earnedBadges }, { data: earnedAch }, { data: allBadges }, { data: allAch }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", uid ?? "").maybeSingle(),
    supabase.from("user_progress").select("*").eq("user_id", uid ?? "").maybeSingle(),
    supabase.from("user_artifact_progress").select("artifact_id"),
    supabase.from("user_badges").select("badge_id, earned_at"),
    supabase.from("user_achievements").select("achievement_id, earned_at"),
    supabase.from("badges").select("*").order("sort_order"),
    supabase.from("achievements").select("*").order("sort_order"),
  ]);
  const earnedBadgeMap = new Map((earnedBadges ?? []).map((b) => [b.badge_id, b.earned_at]));
  const earnedAchIds = new Set((earnedAch ?? []).map((a) => a.achievement_id));
  /** IDs of badges that use emoji (no JPG file) — hidden from the displayed collection. */
  const HIDDEN_BADGE_IDS = new Set([
    "unique-explorer-weapons",
    "unique-explorer-regalia",
    "unique-explorer-music",
    "unique-explorer-crafts",
    "unique-explorer-toys",
  ]);

  const badgesWithState = (allBadges ?? []).map((b: any) => ({ ...b, earned: earnedBadgeMap.has(b.id), earnedAt: earnedBadgeMap.get(b.id) }));
  const earnedAchList = (allAch ?? []).filter((a) => earnedAchIds.has(a.id));

  // Visible badges (exclude hidden ones that use emoji)
  const visibleBadges = badgesWithState.filter((b: any) => !HIDDEN_BADGE_IDS.has(b.id));
  const visibleBadgeEarnedCount = visibleBadges.filter((b: any) => b.earned).length;
  const visibleBadgeTotal = visibleBadges.length; // 7

  // Build separate lists: all badges (visible) + all achievements (with earned flag)
  const badgesAll = visibleBadges; // already has earned + earnedAt from badgesWithState
  const achievementsAll = (allAch ?? []).map((a: any) => ({ ...a, earned: earnedAchIds.has(a.id) }));
  const earnedAchCount = earnedAchIds.size;
  const totalAchCount = (allAch ?? []).length;

  return {
    email: authData.user?.email ?? "",
    username: profile?.username ?? "explorer",
    exp: prog?.total_exp ?? 0,
    level: prog?.current_level ?? 1,
    points: prog?.discount_points ?? 0,
    scanCount: (scanned ?? []).length,
    badges: badgesAll,
    achievements: achievementsAll,
    badgeEarnedCount: visibleBadgeEarnedCount,
    badgeTotalCount: visibleBadgeTotal,
    achEarnedCount: earnedAchCount,
    achTotalCount: totalAchCount,
  };
}

function ProfilePage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["profile"], queryFn: fetchProfile });
  const [selectedBadge, setSelectedBadge] = useState<any | null>(null);

  useEffect(() => {
    if (data?.badges) {
      console.debug("profile: badges icon list", data.badges.map((b: any) => ({ id: b.id, icon: b.icon })));
    }
  }, [data?.badges]);

  if (!data) return <p className="text-sm text-muted-foreground">…</p>;

  function openJourney() {
    sfx.pop();
    setTimeout(() => sfx.tap(), 90);
    void navigate({ to: "/journey" });
  }

  function badgeLore(b: any) {
    const id = b.id;
    const loreMapEn: Record<string, string> = {
      'penemu-pertama': 'Awarded to the first explorers who began the journey — a token of curious discovery.',
      'ahli-kuest': 'Recognizes mastery of museum quests and dedication to learning local heritage.',
      'separuh-jalan': 'Halfway there — commemorates explorers who uncovered half the collection.',
      'peneroka-muzium': 'The Museum Explorer badge for those who discovered every artifact in the collection.'
    };
    const loreMapBm: Record<string, string> = {
      'penemu-pertama': 'Diberi kepada penemu awal — simbol rasa ingin tahu dan penemuan.',
      'ahli-kuest': 'Mengiktiraf kepakaran kuest muzium dan dedikasi terhadap warisan tempatan.',
      'separuh-jalan': 'Separuh jalan — untuk penemu yang menemui separuh koleksi.',
      'peneroka-muzium': 'Lencana Penjelajah Muzium untuk yang menemui setiap artifak.'
    };
    const descEn = b.description_en || loreMapEn[id] || 'A badge earned through exploration and learning.';
    const descBm = b.description_bm || loreMapBm[id] || 'Lencana yang diperoleh melalui penemuan dan pembelajaran.';
    return lang === 'bm' ? descBm : descEn;
  }

  // Calculate progress to next level
  const nextLevelInfo = expToNextLevel(data.exp);
  const expInLevel = data.exp - nextLevelInfo.current;
  const expNeeded = nextLevelInfo.next !== null ? nextLevelInfo.next - nextLevelInfo.current : 1;
  const expProgress = nextLevelInfo.next !== null ? Math.round((expInLevel / expNeeded) * 100) : 100;
  const atMaxLevel = nextLevelInfo.next === null;

  // SVG circle constants for level ring
  const R = 56;
  const CIRCUMFERENCE = 2 * Math.PI * R;
  const fillLength = (expProgress / 100) * CIRCUMFERENCE;
  const dashGap = CIRCUMFERENCE - fillLength;

  try {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        {/* ─── Profile Card ─── */}
        <section className="game-card overflow-hidden p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Gradient header band */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-gold to-indigo" />

          <div className="flex items-center gap-5">
            {/* Level ring */}
            <div className="relative shrink-0">
              <svg width="80" height="80" viewBox="0 0 130 130" className="drop-shadow-md">
                {/* Background circle */}
                <circle
                  cx="65" cy="65" r={R}
                  fill="none"
                  stroke="oklch(0.9 0.01 80)"
                  strokeWidth="8"
                />
                {/* Progress arc */}
                {!atMaxLevel && (
                  <circle
                    cx="65" cy="65" r={R}
                    fill="none"
                    stroke="url(#levelGrad)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${fillLength} ${dashGap}`}
                    transform="rotate(-90 65 65)"
                    className="transition-all duration-700"
                  />
                )}
                {/* Max level badge */}
                {atMaxLevel && (
                  <circle
                    cx="65" cy="65" r={R}
                    fill="none"
                    stroke="url(#levelGrad)"
                    strokeWidth="8"
                    strokeDasharray={`${CIRCUMFERENCE * 0.25} ${CIRCUMFERENCE * 0.75}`}
                    transform="rotate(-90 65 65)"
                    className="animate-spin"
                    style={{ animationDuration: "4s", transformOrigin: "65px 65px" }}
                  />
                )}
                <defs>
                  <linearGradient id="levelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="oklch(0.74 0.13 25)" />
                    <stop offset="100%" stopColor="oklch(0.86 0.1 70)" />
                  </linearGradient>
                </defs>
                {/* Level number */}
                <text
                  x="65" y="60"
                  textAnchor="middle"
                  fontSize="36"
                  fontWeight="700"
                  fontFamily="Fredoka, sans-serif"
                  fill="oklch(0.3 0.035 260)"
                >
                  {data.level}
                </text>
                <text
                  x="65" y="78"
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="Nunito, sans-serif"
                  fill="oklch(0.55 0.03 260)"
                >
                  LEVEL
                </text>
              </svg>
            </div>

            {/* User info */}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {t("profile_greeting")}
              </p>
              <h1 className="truncate font-display text-2xl leading-tight">{data.username}</h1>
              <p className="truncate text-xs text-muted-foreground">{data.email}</p>

              {/* EXP to next level */}
              {!atMaxLevel && (
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  <span className="tabular-nums">{expNeeded - expInLevel}</span> EXP to level {data.level + 1}
                </p>
              )}
              {atMaxLevel && (
                <p className="mt-1 text-[11px] font-semibold text-gold">
                  ★ {t("level_up")}
                </p>
              )}
            </div>
          </div>

          {/* Exp bar */}
          <div className="mt-4">
            <ExpBar exp={data.exp} />
          </div>

          {/* Stats row */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            {/* Scans stat */}
            <button
              type="button"
              onClick={openJourney}
              className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card p-3 text-center transition-[transform,border-color,box-shadow] duration-200 ease-[var(--ease-out)] hover:border-primary/60 hover:shadow-md active:scale-[0.98]"
            >
              {/* Top accent */}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary to-gold" />
              <div className="relative">
                <div className="flex items-center justify-center gap-1 text-muted-foreground">
                  <MapPin className="size-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest">
                    {t("discovered_count")}
                  </span>
                </div>
                <p className="mt-0.5 font-display text-xl tabular-nums">
                  <span className="text-primary">{data.scanCount}</span>
                  <span className="text-sm text-muted-foreground">/{TOTAL_ARTIFACTS}</span>
                </p>
              </div>
            </button>

            {/* Badges stat */}
            <div className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card p-3 text-center">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-gold to-amber-400" />
              <div className="relative">
                <div className="flex items-center justify-center gap-1 text-muted-foreground">
                  <Award className="size-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest">
                    {t("nav_badges")}
                  </span>
                </div>
                <p className="mt-0.5 font-display text-xl tabular-nums">
                  <span className="text-gold-foreground">{data.badgeEarnedCount}</span>
                  <span className="text-sm text-muted-foreground">/{data.badgeTotalCount}</span>
                </p>
              </div>
            </div>

            {/* Achievements stat */}
            <button
              type="button"
              onClick={() => {
                sfx.pop();
                setTimeout(() => sfx.tap(), 90);
                void navigate({ to: "/achievements", hash: "achievements" });
              }}
              className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card p-3 text-center transition-[transform,border-color,box-shadow] duration-200 ease-[var(--ease-out)] hover:border-primary/60 hover:shadow-md active:scale-[0.98]"
            >
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo to-jungle" />
              <div className="relative">
                <div className="flex items-center justify-center gap-1 text-muted-foreground">
                  <Trophy className="size-3.5" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest">
                    {t("nav_achievements")}
                  </span>
                </div>
                <p className="mt-0.5 font-display text-xl tabular-nums">
                  <span className="text-indigo">{data.achEarnedCount}</span>
                  <span className="text-sm text-muted-foreground">/{data.achTotalCount}</span>
                </p>
              </div>
            </button>
          </div>

          {/* Points & Rewards — coin style */}
          <div className="mt-4 flex items-center justify-between rounded-2xl border-2 border-dashed border-gold/50 bg-gradient-to-r from-gold/8 to-gold/3 px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-gold to-amber-400 text-white shadow-sm">
                <Coins className="size-5" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {t("balance")}
                </p>
                <p className="font-display text-xl text-gold-foreground">
                  {data.points} <span className="text-sm font-semibold">{t("points")}</span>
                </p>
              </div>
            </div>
            <Link
              to="/rewards"
              className="bounce-soft inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-md shadow-primary/25"
            >
              <Gift className="size-3.5" />
              {t("nav_rewards")}
            </Link>
          </div>

          {/* Journey CTA */}
          <HoverCard openDelay={120} closeDelay={80}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                onClick={openJourney}
                onMouseEnter={() => sfx.tap()}
                className="group mt-3 flex w-full items-center gap-3 rounded-2xl border-2 border-border bg-gradient-to-br from-accent/60 to-secondary/50 px-4 py-3 text-left transition-[transform,border-color,box-shadow] duration-200 ease-[var(--ease-out)] hover:border-primary/60 hover:shadow-lg active:scale-[0.98]"
                aria-label={t("journey_btn")}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  <Scroll className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <p className="font-display text-base leading-tight">{t("journey_btn")}</p>
                  <p className="truncate text-xs text-muted-foreground">{t("journey_sub")}</p>
                </span>
                <ArrowRight className="size-4 text-muted-foreground transition-[transform,color] duration-200 ease-[var(--ease-out)] group-hover:translate-x-1 group-hover:text-primary" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent side="top" align="center" className="w-72 border-2 border-border bg-card">
              <div className="flex items-start gap-2">
                <Scroll className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="font-display text-sm">{t("journey_hover_title")}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("journey_hover_body")}</p>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </section>

        {/* ─── Badges ─── */}
        <section className="game-card p-5 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "150ms" }}>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="size-4 text-gold" />
              <h2 className="font-display text-lg">{t("nav_badges")}</h2>
              <span className="text-xs text-muted-foreground">({data.badgeEarnedCount}/{data.badgeTotalCount})</span>
            </div>
            <Link to="/achievements" className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors">
              {t("view_all")} →
            </Link>
          </div>

          {data.badgeEarnedCount === 0 ? (
            <p className="text-sm text-muted-foreground">{t("none_yet")}</p>
          ) : (
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
              {data.badges.map((item: any) => {
                const icon = resolveAchievementIcon(item.icon || "🏅", item.id);
                const name = lang === "bm" ? item.name_bm : item.name_en;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedBadge(item)}
                    className="group"
                  >
                    <BadgeMedallion
                      icon={icon}
                      label={item.earned ? name : "???"}
                      rarity={(item.rarity ?? "common") as Rarity}
                      locked={!item.earned}
                      size="md"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── Achievements ─── */}
        {data.achEarnedCount > 0 && (
          <section className="game-card p-5 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "250ms" }}>
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="size-4 text-indigo" />
              <h2 className="font-display text-lg">{t("nav_achievements")}</h2>
              <span className="text-xs text-muted-foreground">({data.achEarnedCount}/{data.achTotalCount})</span>
            </div>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
              {data.achievements.map((item: any) => {
                const icon = resolveAchievementIcon(item.icon || "🏆", item.id);
                const name = lang === "bm" ? item.name_bm : item.name_en;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="group"
                  >
                    <BadgeMedallion
                      icon={icon}
                      label={item.earned ? name : "???"}
                      rarity={(item.rarity ?? "common") as Rarity}
                      locked={!item.earned}
                      size="md"
                    />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Badge detail dialog */}
        <Dialog open={!!selectedBadge} onOpenChange={(v) => { if (!v) setSelectedBadge(null); }}>
          <DialogContent className="max-w-md">
            {selectedBadge && (
              <div>
                <div className="flex items-center gap-4">
                  <BadgeMedallion
                    icon={resolveAchievementIcon(selectedBadge.icon || '🏅', selectedBadge.id)}
                    label={selectedBadge.earned ? (lang === 'bm' ? selectedBadge.name_bm : selectedBadge.name_en) : '???'}
                    rarity={(selectedBadge.rarity ?? 'common') as Rarity}
                    size="lg"
                    locked={!selectedBadge.earned}
                  />
                  <div>
                    <h3 className="font-display text-xl">{selectedBadge.earned ? (lang === 'bm' ? selectedBadge.name_bm : selectedBadge.name_en) : '???'}</h3>
                    {selectedBadge.earned && selectedBadge.earnedAt && (
                      <p className="text-sm text-muted-foreground">{new Date(selectedBadge.earnedAt).toLocaleString()}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  {badgeLore(selectedBadge)}
                </div>
                <div className="mt-6 flex justify-end">
                  <DialogClose className="btn">{t("close")}</DialogClose>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    );
  } catch (err) {
    console.error("Profile render error:", err);
    return (
      <div className="mx-auto max-w-3xl p-6">
        <h2 className="text-xl font-semibold">Profile render error</h2>
        <pre className="mt-3 whitespace-pre-wrap">{String(err)}</pre>
      </div>
    );
  }
}

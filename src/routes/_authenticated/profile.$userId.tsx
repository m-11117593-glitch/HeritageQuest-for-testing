import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, MapPin, Award, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { TOTAL_ARTIFACTS, expToNextLevel, type Rarity } from "@/lib/museum";
import { ExpBar } from "@/components/ExpBar";
import { BadgeMedallion } from "@/components/BadgeMedallion";
import { resolveAchievementIcon } from "@/lib/utils";
import { sfx } from "@/lib/sfx";

export const Route = createFileRoute("/_authenticated/profile/$userId")({
  component: PublicProfilePage,
});

async function fetchPublicProfile({ params }: { params: { userId: string } }) {
  const { userId } = params;
  const [{ data: profile }, { data: prog }, { data: scans }, { data: earnedBadges }, { data: earnedAch }, { data: allBadges }, { data: allAch }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", userId).maybeSingle(),
    supabase.from("user_progress").select("total_exp, current_level").eq("user_id", userId).maybeSingle(),
    supabase.from("user_artifact_progress").select("artifact_id").eq("user_id", userId),
    supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", userId),
    supabase.from("user_achievements").select("achievement_id, earned_at").eq("user_id", userId),
    supabase.from("badges").select("*").order("sort_order"),
    supabase.from("achievements").select("*").order("sort_order"),
  ]);
  if (!profile) return null;

  const earnedBadgeIds = new Set((earnedBadges ?? []).map((b) => b.badge_id));
  const earnedAchIds = new Set((earnedAch ?? []).map((a) => a.achievement_id));

  const badgesWithState = (allBadges ?? []).map((b: any) => ({
    ...b,
    earned: earnedBadgeIds.has(b.id),
    earnedAt: (earnedBadges ?? []).find((eb) => eb.badge_id === b.id)?.earned_at,
  }));

  const achWithState = (allAch ?? []).map((a: any) => ({
    ...a,
    earned: earnedAchIds.has(a.id),
    earnedAt: (earnedAch ?? []).find((ea) => ea.achievement_id === a.id)?.earned_at,
  }));

  return {
    username: profile.username,
    exp: prog?.total_exp ?? 0,
    level: prog?.current_level ?? 1,
    scanCount: (scans ?? []).length,
    badgeCount: earnedBadgeIds.size,
    achCount: earnedAchIds.size,
    badges: badgesWithState,
    achievements: achWithState,
  };
}

function PublicProfilePage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { userId } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: () => fetchPublicProfile({ params: { userId } }),
  });
  const [tab, setTab] = useState<"badges" | "achievements">("badges");

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link to="/friends" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="size-4" />
          {t("back")}
        </Link>
        <p className="text-sm text-muted-foreground">…</p>
      </div>
    );
  }

  const nextLevelInfo = expToNextLevel(data.exp);
  const expInLevel = data.exp - nextLevelInfo.current;
  const expNeeded = nextLevelInfo.next !== null ? nextLevelInfo.next - nextLevelInfo.current : 1;
  const atMaxLevel = nextLevelInfo.next === null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button
        type="button"
        onClick={() => { sfx.tap(); navigate({ to: "/friends" }); }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="size-4" />
        {t("back")}
      </button>

      <section className="game-card overflow-hidden p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-gold to-indigo" />

        <div className="flex items-center gap-5">
          {/* Avatar circle */}
          <div className="grid size-20 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-indigo text-white text-2xl font-display shadow-md">
            {data.username.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("public_profile_title")}</p>
            <h1 className="truncate font-display text-2xl leading-tight">{data.username}</h1>

            {!atMaxLevel && (
              <p className="mt-1 text-[11px] text-muted-foreground/70">
                <span className="tabular-nums">{expNeeded - expInLevel}</span> EXP to level {data.level + 1}
              </p>
            )}
          </div>

          {/* Level badge */}
          <div className="grid size-16 shrink-0 place-items-center rounded-full border-4 border-primary/20 bg-card shadow-sm">
            <div className="text-center">
              <p className="font-display text-xl leading-none text-primary">{data.level}</p>
              <p className="text-[8px] uppercase tracking-wider text-muted-foreground">{t("level")}</p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <ExpBar exp={data.exp} />
        </div>

        {/* Stats row — clickable with hover feedback */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card p-3 text-center transition-[transform,border-color,box-shadow] duration-200 hover:border-primary/60 hover:shadow-md active:scale-[0.98]">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary to-gold" />
            <div className="relative">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <MapPin className="size-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-widest">{t("discovered_count")}</span>
              </div>
              <p className="mt-0.5 font-display text-xl tabular-nums">
                <span className="text-primary">{data.scanCount}</span>
                <span className="text-sm text-muted-foreground">/{TOTAL_ARTIFACTS}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { sfx.tap(); setTab("badges"); }}
            className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card p-3 text-center transition-[transform,border-color,box-shadow] duration-200 hover:border-gold/60 hover:shadow-md active:scale-[0.98]"
          >
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-gold to-amber-400" />
            <div className="relative">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <Award className="size-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-widest">{t("nav_badges")}</span>
              </div>
              <p className="mt-0.5 font-display text-xl tabular-nums">
                <span className="text-gold-foreground">{data.badgeCount}</span>
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => { sfx.tap(); setTab("achievements"); }}
            className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card p-3 text-center transition-[transform,border-color,box-shadow] duration-200 hover:border-indigo/60 hover:shadow-md active:scale-[0.98]"
          >
            <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-indigo to-jungle" />
            <div className="relative">
              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                <Trophy className="size-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-widest">{t("nav_achievements")}</span>
              </div>
              <p className="mt-0.5 font-display text-xl tabular-nums">
                <span className="text-indigo">{data.achCount}</span>
              </p>
            </div>
          </button>
        </div>
      </section>

      {/* ─── Badges & Achievements Section ─── */}
      <section className="game-card p-5 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "150ms" }}>
        {/* Tabs */}
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => { sfx.tap(); setTab("badges"); }}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              tab === "badges"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-ink bg-card border border-border"
            }`}
          >
            <Award className="size-3.5" />
            {t("nav_badges")}
            <span className="ml-0.5 text-[10px] opacity-70">({data.badgeCount})</span>
          </button>
          <button
            type="button"
            onClick={() => { sfx.tap(); setTab("achievements"); }}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
              tab === "achievements"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-ink bg-card border border-border"
            }`}
          >
            <Trophy className="size-3.5" />
            {t("nav_achievements")}
            <span className="ml-0.5 text-[10px] opacity-70">({data.achCount})</span>
          </button>
        </div>

        {/* Badge grid */}
        {tab === "badges" && (
          <div>
            {data.badges.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("none_yet")}</p>
            ) : (
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
                {data.badges.map((b: any) => {
                  const icon = resolveAchievementIcon(b.icon || "🏅", b.id);
                  const name = lang === "bm" ? b.name_bm : b.name_en;
                  return (
                    <div key={b.id} className="flex flex-col items-center">
                      <BadgeMedallion
                        icon={icon}
                        label={b.earned ? name : "???"}
                        rarity={(b.rarity ?? "common") as Rarity}
                        locked={!b.earned}
                        size="sm"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Achievement grid */}
        {tab === "achievements" && (
          <div>
            {data.achievements.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("none_yet")}</p>
            ) : (
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
                {data.achievements.map((a: any) => {
                  const icon = resolveAchievementIcon(a.icon || "🏆", a.id);
                  const name = lang === "bm" ? a.name_bm : a.name_en;
                  return (
                    <div key={a.id} className="flex flex-col items-center">
                      <BadgeMedallion
                        icon={icon}
                        label={a.earned ? name : "???"}
                        rarity={(a.rarity ?? "common") as Rarity}
                        locked={!a.earned}
                        size="sm"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

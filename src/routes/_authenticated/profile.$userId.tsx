import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Award, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { TOTAL_ARTIFACTS, expToNextLevel } from "@/lib/museum";
import { ExpBar } from "@/components/ExpBar";
import { sfx } from "@/lib/sfx";

export const Route = createFileRoute("/_authenticated/profile/$userId")({
  component: PublicProfilePage,
});

async function fetchPublicProfile({ params }: { params: { userId: string } }) {
  const { userId } = params;
  const [{ data: profile }, { data: prog }, { data: scans }, { data: badges }, { data: ach }] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", userId).maybeSingle(),
    supabase.from("user_progress").select("total_exp, current_level").eq("user_id", userId).maybeSingle(),
    supabase.from("user_artifact_progress").select("artifact_id").eq("user_id", userId),
    supabase.from("user_badges").select("badge_id").eq("user_id", userId),
    supabase.from("user_achievements").select("achievement_id").eq("user_id", userId),
  ]);
  if (!profile) return null;
  return {
    username: profile.username,
    exp: prog?.total_exp ?? 0,
    level: prog?.current_level ?? 1,
    scanCount: (scans ?? []).length,
    badgeCount: (badges ?? []).length,
    achCount: (ach ?? []).length,
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
      <Link
        to="/friends"
        onClick={() => sfx.tap()}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
      >
        <ArrowLeft className="size-4" />
        {t("back")}
      </Link>

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

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card p-3 text-center">
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

          <div className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card p-3 text-center">
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
          </div>

          <div className="group relative overflow-hidden rounded-2xl border-2 border-border bg-card p-3 text-center">
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
          </div>
        </div>
      </section>
    </div>
  );
}

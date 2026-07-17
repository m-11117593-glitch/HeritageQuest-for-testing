import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Map, Flag, User, ScanLine, Volume2, VolumeX, LogOut, Award, Trophy } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { supabase } from "@/integrations/supabase/client";
import { sfx } from "@/lib/sfx";

async function fetchActiveUq() {
  const { data } = await supabase.from("user_unique_quests").select("template_id,status,correct_scans").eq("status","active").maybeSingle();
  if (!data) return null;
  const { data: tmpl } = await supabase.from("unique_quest_templates").select("*").eq("id", data.template_id).maybeSingle();
  return tmpl ? { ...tmpl, correct_scans: data.correct_scans } : null;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const loc = useLocation();
  const qc = useQueryClient();
  const [muted, setMuted] = useState(() => sfx.isMuted());
  const { data: uq } = useQuery({ queryKey: ["active-uq"], queryFn: fetchActiveUq });

  function toggleMute() { const n = !muted; setMuted(n); sfx.setMuted(n); if (!n) sfx.pop(); }
  async function signOut() { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); nav({ to: "/auth", replace: true }); }

  const items: Array<{ to: "/scan" | "/map" | "/quizzes" | "/quests" | "/leaderboard" | "/profile"; icon: typeof Map; label: string; hero?: boolean }> = [
    { to: "/scan",    icon: ScanLine, label: t("nav_scan"),    hero: true },
    { to: "/map",     icon: Map,      label: t("nav_map") },
    { to: "/quizzes", icon: Award,    label: t("nav_quizzes") },
    { to: "/quests",  icon: Flag,     label: t("nav_quests") },
    { to: "/leaderboard", icon: Trophy, label: t("nav_leaderboard") },
    { to: "/profile", icon: User,     label: t("nav_profile") },
  ];

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-gold to-indigo" />
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/scan" onClick={() => sfx.tap()} className="flex items-center gap-2 bounce-soft">
            <div className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground font-display text-lg shadow-sm">✿</div>
            <div>
              <p className="font-display leading-none text-lg">HeritageQuest <span className="text-[10px] font-semibold text-primary/60 ml-1">v1.2</span></p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t("tagline")}</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button onClick={toggleMute} title={muted ? "Unmute" : "Mute"} className="bounce-soft grid size-9 place-items-center rounded-full border border-border text-muted-foreground hover:text-ink">
              {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            </button>
            <button onClick={signOut} title={t("signout")} className="bounce-soft grid size-9 place-items-center rounded-full border border-border text-muted-foreground hover:text-ink">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
        {uq && (
          <div className="mx-auto max-w-6xl px-4 pb-3">
            <div className="rounded-2xl border-2 border-gold bg-gradient-to-r from-gold/25 to-primary/15 px-3 py-2 shadow-sm">
              <div className="flex items-center gap-2 text-xs">
                <span className="sparkle text-base">✨</span>
                <span className="font-display text-sm text-ink truncate flex-1">{lang === "bm" ? uq.name_bm : uq.name_en}</span>
                <span className="chip border-gold bg-card text-[10px]">{t("uq_progress")} {uq.correct_scans}/{uq.target_count}</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-card">
                <div className="h-full bg-gradient-to-r from-primary to-gold transition-[width] duration-500 ease-out" style={{ width: `${Math.min(100, (uq.correct_scans / uq.target_count) * 100)}%` }} />
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6">{children}</main>

      {/* bottom nav with center-elevated Scan button */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-border bg-card/95 backdrop-blur">
        <ul className="mx-auto flex max-w-6xl items-end justify-around px-2 pb-2 pt-1">
          {items.map((it) => {
            const active = loc.pathname === it.to || loc.pathname.startsWith(it.to + "/");
            const Icon = it.icon;
            if (it.hero) {
              return (
                <li key={it.to} className="-mt-6 flex-shrink-0">
                  <Link
                    to={it.to}
                    onClick={() => sfx.tap()}
                    className="flex flex-col items-center gap-1"
                    aria-label={it.label}
                  >
                    <span className={`grid size-16 place-items-center rounded-full border-4 border-card bg-gradient-to-br from-primary to-gold text-primary-foreground shadow-[0_10px_24px_-6px_oklch(0.7_0.15_25/0.6)] ${active ? "scale-105" : ""} transition-transform duration-200 ease-[var(--ease-out)] active:scale-95`}>
                      <Icon className="size-7" />
                    </span>
                    <span className={`max-w-[72px] truncate text-[10px] font-bold uppercase tracking-widest ${active ? "text-primary" : "text-muted-foreground"}`}>{it.label}</span>
                  </Link>
                </li>
              );
            }
            return (
              <li key={it.to} className="flex-1">
                <Link to={it.to} onClick={() => sfx.tap()} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "text-primary" : "text-muted-foreground"}`}>
                  <Icon className={`size-5 ${active ? "scale-110" : ""} transition-transform duration-200 ease-[var(--ease-out)]`} />
                  <span className="max-w-[72px] truncate">{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

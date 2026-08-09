import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";

// Post-verification / post-reset links always land on the live site, never localhost.
const APP_URL = "https://v2.lxviidev.workers.dev";

const search = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => search.parse(s),
  component: AuthPage,
});

type Strength = { level: 0 | 1 | 2 | 3; labelBm: string; labelEn: string; color: string };

function scorePassword(p: string): Strength {
  if (!p) return { level: 0, labelBm: "—", labelEn: "—", color: "oklch(0.85 0.02 80)" };
  let types = 0;
  if (/[a-z]/.test(p)) types++;
  if (/[A-Z]/.test(p)) types++;
  if (/[0-9]/.test(p)) types++;
  if (/[^A-Za-z0-9]/.test(p)) types++;
  if (p.length >= 12 && types >= 3) {
    return { level: 3, labelBm: "Kuat", labelEn: "Strong", color: "oklch(0.62 0.16 145)" };
  }
  if (p.length >= 8 && types >= 2) {
    return { level: 2, labelBm: "Sederhana", labelEn: "Medium", color: "oklch(0.72 0.16 55)" };
  }
  return { level: 1, labelBm: "Lemah", labelEn: "Weak", color: "oklch(0.6 0.22 25)" };
}

function AuthPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "recovery">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [infoTitle, setInfoTitle] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const clearMessages = () => { setError(null); setInfo(null); setInfoTitle(null); };
  const showInfo = (title: string, body: string) => { setInfoTitle(title); setInfo(body); };

  useEffect(() => {
    // Password recovery links land on /auth with tokens in the URL hash.
    if (window.location.hash.includes("type=recovery")) {
      setMode("recovery");
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) setError(t("auth_reset_invalid"));
      });
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: redirect ?? "/map" });
    });
  }, [navigate, redirect]);

  const strength = useMemo(() => scorePassword(password), [password]);
  const confirmMismatch = (mode === "signup" || mode === "recovery") && confirmPassword.length > 0 && password !== confirmPassword;
  const canSignup = mode === "signup" && strength.level === 3 && password === confirmPassword;
  const canReset = mode === "recovery" && strength.level === 3 && password === confirmPassword;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); clearMessages();
    try {
      if (mode === "signup") {
        if (strength.level !== 3) {
          throw new Error(lang === "bm"
            ? "Kata laluan mesti mencapai tahap Kuat (hijau) sebelum mendaftar."
            : "Password must reach Strong (green) before you can sign up.");
        }
        if (password !== confirmPassword) {
          throw new Error(lang === "bm" ? "Pengesahan kata laluan tidak sepadan." : "Password confirmation does not match.");
        }
        const { data, error } = await supabase.auth.signUp({
          email, password,
          // Always redirect post-verification to the live site, never localhost.
          options: { data: { username: username || email.split("@")[0] }, emailRedirectTo: APP_URL },
        });
        if (error) throw error;
        if (!data.session) {
          showInfo(t("auth_confirm_email_title"), t("auth_confirm_email_body").replace("{email}", email));
          setMode("signin");
          setPassword("");
          setConfirmPassword("");
          return;
        }
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${APP_URL}/auth`,
        });
        if (error) throw error;
        showInfo(t("auth_reset_email_title"), t("auth_reset_sent").replace("{email}", email));
        setMode("signin");
        return;
      } else if (mode === "recovery") {
        if (strength.level !== 3) {
          throw new Error(
            lang === "bm"
              ? "Kata laluan mesti mencapai tahap Kuat (hijau) sebelum menetapkan semula."
              : "Password must reach Strong (green) before you can reset.",
          );
        }
        if (password !== confirmPassword) {
          throw new Error(lang === "bm" ? "Pengesahan kata laluan tidak sepadan." : "Password confirmation does not match.");
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        navigate({ to: redirect ?? "/map" });
        return;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      navigate({ to: redirect ?? "/map" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  }

  const strengthLabel = lang === "bm" ? strength.labelBm : strength.labelEn;

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-primary via-gold to-indigo" />
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <a href="/" className="font-display text-xl">✿ HeritageQuest</a>
        <LanguageToggle />
      </header>
      <main className="mx-auto grid min-h-[80vh] max-w-md place-items-center px-6">
        <div className="paper-card w-full p-8 pop-in">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">{t("tagline")}</p>
          <h1 className="mt-2 font-display text-3xl">{mode === "recovery" ? t("auth_reset_title") : t("auth_welcome")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "forgot" ? t("auth_forgot_sub") : mode === "recovery" ? t("auth_reset_sub") : t("auth_sub")}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("username")}</span>
                <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-ring" />
              </label>
            )}
            {mode !== "recovery" && (
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("email")}</span>
                <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none focus:border-ring" />
              </label>
            )}

            {mode !== "forgot" && (
              <label className="block text-sm">
                <span className="mb-1 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("password")}
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => { clearMessages(); setPassword(""); setMode("forgot"); }}
                      className="font-medium normal-case tracking-normal text-primary underline-offset-4 hover:underline"
                    >
                      {t("auth_forgot")}
                    </button>
                  )}
                </span>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete={mode === "signup" || mode === "recovery" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 outline-none focus:border-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t("auth_hide_password") : t("auth_show_password")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 grid size-7 place-items-center rounded-md text-muted-foreground hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </label>
            )}

            {(mode === "signup" || mode === "recovery") && (
              <>
                <div>
                  <div className="flex h-1.5 gap-1 overflow-hidden rounded-full bg-muted">
                    {[1, 2, 3].map((seg) => (
                      <div
                        key={seg}
                        className="h-full flex-1 rounded-full transition-all"
                        style={{ background: strength.level >= seg ? strength.color : "transparent" }}
                      />
                    ))}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      {t("auth_password_strength")}
                    </span>
                    <span className="font-semibold" style={{ color: strength.level > 0 ? strength.color : "oklch(0.55 0.02 80)" }}>
                      {strengthLabel}
                    </span>
                  </div>
                  {strength.level < 3 && password.length > 0 && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {t("auth_password_hint")}
                    </p>
                  )}
                </div>

                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("auth_confirm_password")}
                  </span>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full rounded-md border bg-background px-3 py-2 pr-10 outline-none focus:border-ring ${confirmMismatch ? "border-destructive" : "border-input"}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      aria-label={showConfirm ? t("auth_hide_password") : t("auth_show_password")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 grid size-7 place-items-center rounded-md text-muted-foreground hover:text-ink"
                    >
                      {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {confirmMismatch && (
                    <p className="mt-1 text-[11px] text-destructive">
                      {t("auth_passwords_mismatch")}
                    </p>
                  )}
                </label>
              </>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            {info && (
              <div className="rounded-2xl border-2 border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
                <p className="mb-1 font-display text-primary">
                  {infoTitle ?? t("auth_confirm_email_title")}
                </p>
                <p>{info}</p>
              </div>
            )}
            <button
              disabled={busy || (mode === "signup" && !canSignup) || (mode === "recovery" && !canReset)}
              type="submit"
              className="bounce-soft w-full rounded-full bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "…" : mode === "signin" ? t("signin") : mode === "forgot" ? t("auth_send_reset") : mode === "recovery" ? t("auth_reset_btn") : t("signup")}
            </button>
            {(mode === "signup" || mode === "recovery") && !(mode === "signup" ? canSignup : canReset) && password.length > 0 && (
              <p className="text-center text-[11px] text-muted-foreground">
                {mode === "recovery" ? t("auth_reset_hint") : t("auth_signup_hint")}
              </p>
            )}
          </form>

          <div className="ornament-rule my-6 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <span>{t("auth_or")}</span>
          </div>

          <button
            type="button"
            onClick={() => { clearMessages(); setConfirmPassword(""); setMode(mode === "signin" ? "signup" : "signin"); }}
            className="w-full text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {mode === "signin" ? t("auth_new_here") : mode === "signup" ? t("auth_have_acct") : t("auth_back_to_signin")}
          </button>
        </div>
      </main>
    </div>
  );
}

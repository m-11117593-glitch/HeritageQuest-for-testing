import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Sparkles, TrendingUp, X, Star, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { sfx } from "@/lib/sfx";

interface Props {
  /** New level number (e.g., 6) */
  level: number;
  /** Number of levels gained in this action (usually 1) */
  levelUps: number;
  /** Optional callback when the popup closes */
  onClose?: () => void;
}

/** Sparkle particle data */
interface Particle {
  id: number;
  color: string;
  left: string;
  delay: string;
  size: number;
  drift: string;
  fall: string;
}

const PARTICLE_COLORS = [
  "oklch(0.86 0.1 70)",    // gold
  "oklch(0.74 0.13 25)",   // primary
  "oklch(0.72 0.09 165)",  // jungle
  "oklch(0.9 0.08 35)",    // coral
  "oklch(0.7 0.08 265)",   // indigo
  "oklch(0.78 0.12 25)",   // stamp
];

export function LevelUpPopup({ level, levelUps, onClose }: Props) {
  const { t, lang } = useI18n();
  const [visible, setVisible] = useState(true);

  // Play the level-up sound on mount
  useEffect(() => {
    sfx.levelUp();
    // Extra shimmer for 2+ level ups
    if (levelUps >= 2) {
      setTimeout(() => sfx.fanfare(), 400);
    }
  }, [level, levelUps]);

  function handleDismiss() {
    setVisible(false);
    onClose?.();
  }

  // Generate floating particles
  const particles = useMemo<Particle[]>(() =>
    Array.from({ length: 16 }, (_, i) => ({
      id: i,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      left: `${10 + Math.random() * 80}%`,
      delay: `${Math.random() * 0.8}s`,
      size: 4 + Math.random() * 6,
      drift: `${(Math.random() - 0.5) * 60}px`,
      fall: `${-(60 + Math.random() * 100)}px`,
    })),
  []);

  // Determine the message based on level
  const congratsMsg = lang === "bm"
    ? `Tahniah! Anda kini Tahap ${level}!`
    : `Congratulations! You're now Level ${level}!`;

  const growthMsg = lang === "bm"
    ? levelUps >= 2
      ? "Anda naik berlipat ganda — luar biasa!"
      : level >= 8
        ? "Semakin kuat! Teruskan pengembaraan."
        : level >= 5
          ? "Anda berkembang pantas! Hebat!"
          : "Perjalanan baru bermula — terus maju!"
    : levelUps >= 2
      ? "Multi-level up — incredible!"
      : level >= 8
        ? "Getting stronger! Keep exploring."
        : level >= 5
          ? "You're growing fast! Amazing!"
          : "The journey begins — keep going!";

  const effMsg = lang === "bm"
    ? `+${levelUps * 5} mata ganjaran diperoleh!`
    : `+${levelUps * 5} reward points earned!`;

  const emoji = level >= 8 ? "🌟" : level >= 5 ? "🔥" : "⭐";

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center p-4 transition-all duration-500 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Card */}
      <div
        className={`relative w-full max-w-sm overflow-hidden rounded-3xl border-2 border-gold/40 bg-gradient-to-br from-amber-50 via-white to-gold/10 shadow-2xl shadow-gold/20 transition-all duration-500 ${
          visible
            ? "scale-100 translate-y-0"
            : "scale-75 translate-y-8"
        }`}
      >
        {/* Gradient header band */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-gold to-amber-400" />

        {/* Floating particles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full animate-float-up"
              style={{
                left: p.left,
              bottom: "-10%",
              width: p.size,
              height: p.size,
              background: p.color,
              animationDelay: p.delay,
              animationDuration: `${2 + Math.random() * 1.5}s`,
              ["--drift" as string]: p.drift,
              ["--fall" as string]: p.fall,
              }}
            />
          ))}
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3 top-3 z-10 grid size-8 place-items-center rounded-full bg-black/5 text-muted-foreground transition-colors hover:bg-black/10 hover:text-ink"
        >
          <X className="size-4" />
        </button>

        <div className="relative px-8 pb-8 pt-10 text-center">
          {/* Emoji burst */}
          <div className="mb-4 flex justify-center">
            <div className="relative">
              {/* Ring pulses */}
              <div className="absolute inset-0 animate-ping rounded-full bg-gold/20" style={{ animationDuration: "1.5s" }} />
              <div
                className="absolute inset-0 rounded-full bg-gold/10"
                style={{ animation: "ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite", animationDelay: "0.3s" }}
              />
              <div
                className="relative flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-gold to-primary text-white shadow-xl shadow-gold/30 bounce-celebrate"
                style={{ animationDuration: "0.6s" }}
              >
                <Star className="absolute size-9 fill-white/30" />
                <Sparkles className="size-12" />
              </div>
            </div>
          </div>

          {/* Level badge */}
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-primary/10 to-gold/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-ink">
            <TrendingUp className="size-3.5 text-gold" />
            {t("level_up")}
            {levelUps >= 2 && (
              <span className="ml-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                x{levelUps}
              </span>
            )}
          </div>

          {/* Large level number */}
          <div className="mb-3">
            <span className="font-display text-7xl font-bold leading-none tracking-tight text-ink">
              {level}
            </span>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              LEVEL
            </p>
          </div>

          {/* Congratulatory message */}
          <p className="font-display text-xl font-semibold leading-tight text-ink">
            {emoji} {congratsMsg}
          </p>

          {/* Growth message */}
          <p className="mt-2 text-sm text-muted-foreground">
            {growthMsg}
          </p>

          {/* Reward points */}
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-4 py-2 text-sm font-semibold text-gold-foreground">
            <Zap className="size-4" />
            {effMsg}
          </div>

          {/* Fine print */}
          <p className="mt-4 text-[10px] text-muted-foreground/50">
            {lang === "bm" ? "Klik X untuk menutup." : "Click X to close."}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

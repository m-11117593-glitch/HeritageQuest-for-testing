import { useMemo } from "react";
import { CheckCircle2, XCircle, Sparkles } from "lucide-react";

/* ── Feedback popup: big icon that springs up and fades ── */
export function FeedbackPopup({ type, hardMode }: { type: "correct" | "wrong"; hardMode?: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      {/* Background flash — more intense in hard mode */}
      <div
        className={`absolute inset-0 ${
          type === "correct"
            ? hardMode
              ? "bg-cyan-500/10 animate-pulse"
              : "bg-jungle/5"
            : hardMode
              ? "bg-red-600/15 animate-pulse"
              : "bg-destructive/5"
        } animate-in fade-in duration-300`}
        style={hardMode ? { animationDuration: "0.8s" } : undefined}
      />
      {/* Hard mode: massive tick/cross icons — no empty circles */}
      {hardMode && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <div style={{ animation: type === "correct" ? "hm-correct-burst 1s cubic-bezier(.34,1.56,.64,1) both" : "hm-wrong-crash 0.9s cubic-bezier(.34,1.56,.64,1) both" }}>
            <div className={`flex size-56 items-center justify-center rounded-full shadow-2xl ${
              type === "correct"
                ? "bg-gradient-to-br from-cyan-500 via-sky-500 to-blue-600 shadow-cyan-500/50 hm-glow-pulse"
                : "bg-gradient-to-br from-red-600 via-rose-600 to-orange-600 shadow-red-500/50"
            }`}>
              {type === "correct" ? (
                <CheckCircle2 className="size-36 text-white drop-shadow-2xl" />
              ) : (
                <XCircle className="size-36 text-white drop-shadow-2xl" />
              )}
            </div>
          </div>
        </div>
      )}
      {/* Small icon (kept for normal mode) */}
      {!hardMode && (
        <div className="feedback-popup">
          {type === "correct" ? (
            <div className="flex size-28 items-center justify-center rounded-full shadow-2xl bg-gradient-to-br from-jungle to-emerald-400 shadow-jungle/40">
              <CheckCircle2 className="size-16 text-white drop-shadow-lg" />
            </div>
          ) : (
            <div className="flex size-28 items-center justify-center rounded-full shadow-2xl bg-gradient-to-br from-destructive to-red-400 shadow-destructive/40">
              <XCircle className="size-16 text-white drop-shadow-lg" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Confetti particles for celebration ── */
export function ConfettiBurst({ count = 16, hardMode }: { count?: number; hardMode?: boolean }) {
  const particles = useMemo(() => {
    const normColors = [
      "oklch(0.86 0.1 70)",   // gold
      "oklch(0.74 0.13 25)",  // primary
      "oklch(0.72 0.09 165)", // jungle
      "oklch(0.7 0.08 265)",  // indigo
      "oklch(0.9 0.08 35)",   // coral
      "oklch(0.78 0.12 25)",  // stamp
    ];
    const hmColors = [
      "oklch(0.78 0.2 210)",  // fluorescent cyan
      "oklch(0.75 0.18 220)", // electric blue
      "oklch(0.8 0.16 230)",  // bright sky blue
      "oklch(0.72 0.22 200)", // neon teal
      "oklch(0.82 0.14 240)", // light blue
      "oklch(0.7 0.2 190)",   // cyan
      "oklch(0.76 0.17 215)", // ocean blue
    ];
    const colors = hardMode ? hmColors : normColors;
    return Array.from({ length: hardMode ? count + 8 : count }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      left: `${(i / (hardMode ? count + 8 : count)) * 100}%`,
      fall: `-${60 + Math.random() * 120}px`,
      spin: `${Math.random() > 0.5 ? "" : "-"}${120 + Math.random() * 480}deg`,
      delay: `${Math.random() * 0.3}s`,
      size: hardMode ? 6 + Math.random() * 8 : 5 + Math.random() * 7,
    }));
  }, [count, hardMode]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-particle absolute top-1/2 rounded-full"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.color,
            ["--fall" as string]: p.fall,
            ["--spin" as string]: p.spin,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

/* ── Pulse ring that radiates on correct answer ── */
export function PulseRing({ color = "oklch(0.72 0.09 165)", hardMode }: { color?: string; hardMode?: boolean }) {
  return (
    <div
      className="pulse-glow pointer-events-none absolute inset-0 rounded-2xl"
      style={{
        border: `3px solid ${color}`,
        boxShadow: hardMode ? `0 0 18px -2px ${color}` : undefined,
      }}
    />
  );
}

/* ── Splash burst effect for hard mode correct answers ── */
export function SplashEffect({ count = 10 }: { count?: number }) {
  const particles = useMemo(() => {
    const colors = [
      "oklch(0.75 0.2 210)",  // fluorescent cyan
      "oklch(0.78 0.18 220)",  // electric blue
      "oklch(0.72 0.22 200)",  // neon teal
      "oklch(0.8 0.16 230)",   // bright sky blue
      "oklch(0.7 0.2 190)",    // cyan
      "oklch(0.76 0.15 240)",  // cool blue
    ];
    const shapes = ["circle", "star", "diamond"] as const;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * 360;
      const dist = 40 + Math.random() * 80;
      const rad = (angle * Math.PI) / 180;
      return {
        id: i,
        color: colors[i % colors.length],
        x: `${Math.cos(rad) * dist}px`,
        y: `${Math.sin(rad) * dist}px`,
        delay: `${Math.random() * 0.15}s`,
        size: 4 + Math.random() * 6,
        shape: shapes[i % shapes.length],
      };
    });
  }, [count]);

  return (
    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
      {particles.map((p) => (
        <div
          key={p.id}
          className="splash-particle"
          style={{
            position: "absolute" as const,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.shape === "circle" ? "50%" : p.shape === "diamond" ? "2px" : "50% 50% 50% 0",
            transform: p.shape === "diamond" ? "rotate(45deg)" : "none",
            boxShadow: `0 0 6px ${p.color}`,
            ["--splash-x" as string]: p.x,
            ["--splash-y" as string]: p.y,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

/* ── Streak / Combo Meter — Duolingo-inspired streak tracker ── */
export function ComboMeter({ streak, animKey, hardMode }: { streak: number; animKey: number; hardMode?: boolean }) {
  if (streak === 0) return null;

  const isHot = streak >= 3;
  const isOnFire = streak >= 4;

  let emoji: string;
  let colorClass: string;
  let bgClass: string;

  if (hardMode) {
    // Hard mode: purple/magenta streak colors
    if (streak === 1) {
      emoji = "✅";
      colorClass = "text-purple-400";
      bgClass = "bg-purple-500/10";
    } else if (streak === 2) {
      emoji = "💜";
      colorClass = "text-violet-400 streak-glow";
      bgClass = "bg-violet-500/10";
    } else if (streak === 3) {
      emoji = "🔮💜";
      colorClass = "text-fuchsia-400 streak-glow";
      bgClass = "bg-fuchsia-500/10";
    } else {
      emoji = "💥🔮";
      colorClass = "text-pink-400 streak-glow";
      bgClass = "bg-pink-500/10";
    }
  } else {
    if (streak === 1) {
      emoji = "✅";
      colorClass = "text-jungle";
      bgClass = "bg-jungle/10";
    } else if (streak === 2) {
      emoji = "🔥";
      colorClass = "text-amber-500 dark:text-amber-400 streak-glow";
      bgClass = "bg-amber-500/10";
    } else if (streak === 3) {
      emoji = "🔥🔥";
      colorClass = "text-orange-500 dark:text-orange-400 streak-glow";
      bgClass = "bg-orange-500/10";
    } else {
      emoji = "💥🔥";
      colorClass = "text-rose-500 dark:text-rose-400 streak-glow";
      bgClass = "bg-rose-500/10";
    }
  }

  return (
    <div
      key={animKey}
      className={`combo-slide-in flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${colorClass} ${bgClass} ${
        isOnFire ? "fire-flicker" : ""
      }`}
    >
      <span className={`${isOnFire ? "fire-flicker" : ""}`}>{emoji}</span>
      <span className="streak-bump font-display text-sm">{streak}</span>
      {isOnFire && <span className="ml-0.5 text-[9px] opacity-60">COMBO!</span>}
    </div>
  );
}

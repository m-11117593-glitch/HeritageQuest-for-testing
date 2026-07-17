import { useEffect, useState } from "react";
import { RARITY_STYLE, type Rarity } from "@/lib/museum";

interface Props {
  icon: string;      // emoji or SVG filename or path
  label: string;
  sublabel?: string;
  rarity: Rarity;
  locked?: boolean;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: { outer: 60, disc: 44, emoji: 22, ribbonW: 46, textLabel: "text-[10px]" },
  md: { outer: 84, disc: 60, emoji: 30, ribbonW: 66, textLabel: "text-xs" },
  lg: { outer: 110, disc: 82, emoji: 42, ribbonW: 90, textLabel: "text-sm" },
} as const;

/**
 * Returns true if the icon string looks like a filename (no emoji, no path separators).
 * BadgeMedallion renders these as <img> from /achievements/{name}.svg|jpg|jpeg.
 */
function isFilenamelike(icon: string): boolean {
  return /^[a-z0-9\-_.]+(\.[a-z]+)?$/i.test(icon);
}

/** Supported image extensions for badge/achievement icons. */
const IMG_EXTS = [".svg", ".jpg", ".jpeg"];

export function BadgeMedallion({ icon, label, sublabel, rarity, locked, size = "md" }: Props) {
  const s = SIZES[size];
  const style = RARITY_STYLE[rarity];
  const [imgFailed, setImgFailed] = useState(false);

  // Reset imgFailed when icon changes so a new src is always attempted
  useEffect(() => setImgFailed(false), [icon]);

  const isFile = isFilenamelike(icon);
  const imgSrc = isFile
    ? (() => {
        const lower = icon.toLowerCase();
        const hasExt = IMG_EXTS.some((e) => lower.endsWith(e));
        return hasExt ? `/achievements/${lower}` : `/achievements/${lower}.svg`;
      })()
    : null;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: s.outer, height: s.outer + 14 }}>
        {/* ribbons */}
        <div
          className="absolute left-1/2 top-[76%] -translate-x-1/2"
          style={{
            width: s.ribbonW,
            height: 18,
            background: locked ? "oklch(0.85 0.01 80)" : style.ring,
            clipPath: "polygon(0 0,100% 0,90% 100%,50% 70%,10% 100%)",
            filter: locked ? "grayscale(1) opacity(0.6)" : "none",
          }}
        />
        {/* outer star ring */}
        <div
          className="absolute inset-0 grid place-items-center"
          style={{
            background: locked ? "oklch(0.9 0.005 80)" : style.grad,
            borderRadius: "50%",
            boxShadow: locked ? "none" : `0 0 0 3px var(--color-card), 0 6px 18px -6px ${style.glow}, 0 0 30px -8px ${style.glow}`,
            filter: locked ? "grayscale(0.9)" : "none",
          }}
        >
          {/* inner disc */}
          <div
            className="grid place-items-center"
            style={{
              width: s.disc,
              height: s.disc,
              borderRadius: "50%",
              overflow: "hidden",
              background: "var(--color-card)",
              border: `2px solid ${locked ? "oklch(0.85 0.01 80)" : style.ring}`,
              boxShadow: "inset 0 0 0 2px oklch(1 0 0 / 0.6)",
            }}
          >
            {isFile && imgSrc && !imgFailed ? (
              <img
                src={imgSrc}
                alt={label}
                onError={() => setImgFailed(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', filter: locked ? 'grayscale(1) opacity(0.5)' : 'none' }}
              />
            ) : (
              <span style={{ fontSize: s.emoji, filter: locked ? 'grayscale(1) opacity(0.5)' : 'none' }}>{locked ? '🔒' : icon}</span>
            )}
          </div>
        </div>
        {/* sparkles for legendary+epic */}
        {!locked && (rarity === "legendary" || rarity === "epic") && (
          <>
            <span className="sparkle absolute -left-1 top-2 text-xs">✦</span>
            <span className="sparkle absolute -right-1 top-4 text-xs" style={{ animationDelay: "0.4s" }}>✧</span>
            <span className="sparkle absolute left-3 -top-1 text-xs" style={{ animationDelay: "0.8s" }}>✦</span>
          </>
        )}
      </div>
      <p className={`mt-3 max-w-full text-center font-display ${s.textLabel} leading-tight break-words ${locked ? "text-muted-foreground" : "text-ink"}`}>{label}</p>
      {sublabel && <p className={`text-center text-[10px] uppercase tracking-widest ${locked ? "text-muted-foreground/70" : "text-muted-foreground"}`}>{sublabel}</p>}
    </div>
  );
}

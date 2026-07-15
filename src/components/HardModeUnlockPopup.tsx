import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Zap, Skull, Shield, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { sfx } from "@/lib/sfx";

interface Props {
  onAccept: () => void;
  onDecline: () => void;
}

export function HardModeUnlockPopup({ onAccept, onDecline }: Props) {
  const { t, lang } = useI18n();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    sfx.hardFanfare();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleAccept() {
    sfx.pop();
    onAccept();
  }

  function handleDecline() {
    sfx.tap();
    onDecline();
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Dark backdrop with red tint */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70 backdrop-blur-sm" />

      {/* Card — dark theme, aggressive styling */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border-2 border-red-500/30 bg-gradient-to-br from-zinc-900 via-zinc-950 to-slate-900 shadow-2xl shadow-red-900/30">
        {/* Gradient header band — red/amber */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-red-700 via-amber-600 to-red-700" />

        {/* Subtle diagonal lines pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: `repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 20px)` }}
        />

        <div className="relative px-8 pb-8 pt-10 text-center">
          {/* Skull icon */}
          <div className="mb-4 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-red-500/20" style={{ animationDuration: "2s" }} />
              <div className="relative flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-red-800 via-zinc-800 to-amber-900 text-white shadow-xl shadow-red-900/30 bounce-celebrate">
                <Skull className="size-12" />
                <Shield className="absolute -bottom-1 -right-1 size-8 text-amber-500" style={{ opacity: 0.6 }} />
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-red-900/50 to-amber-900/50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-red-400">
            <Zap className="size-3.5 text-amber-400" />
            {t("hm_label")}
          </div>

          {/* Main text */}
          <div className="mb-2">
            <span className="font-display text-3xl font-bold leading-tight tracking-tight text-white">
              {t("hm_unlock_title")}
            </span>
          </div>

          <p className="text-sm leading-relaxed text-zinc-300">
            {t("hm_unlock_body")}
          </p>

          {/* Warning badge */}
          <div className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full border border-red-800/50 bg-red-950/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-red-400">
            <Shield className="size-3" />
            +4 Hard Questions · Extra EXP
          </div>

          {/* Buttons */}
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleAccept}
              className="bounce-soft flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-700 to-amber-700 px-6 py-3 font-bold text-white shadow-lg shadow-red-900/30 hover:shadow-xl hover:shadow-red-800/40 active:scale-95"
            >
              <Skull className="size-4" />
              {t("hm_unlock_accept")}
            </button>
            <button
              type="button"
              onClick={handleDecline}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/60 px-6 py-3 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white active:scale-95"
            >
              <X className="size-4" />
              {t("hm_unlock_decline")}
            </button>
          </div>

          {/* Unlock condition */}
          <p className="mt-4 text-[10px] text-zinc-500">
            {t("hm_unlock_locked")}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

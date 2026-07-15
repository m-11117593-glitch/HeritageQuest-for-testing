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
      {/* Soft translucent backdrop — no black */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-500/30 via-zinc-400/20 to-zinc-500/30 backdrop-blur-sm" />

      {/* Card — medium-warm grey with fluorescent cyan border, no dark/black */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border-2 border-cyan-400/30 bg-gradient-to-br from-zinc-100 via-zinc-50 to-amber-50 shadow-2xl shadow-cyan-500/20">
        {/* Gradient header band — fluorescent cyan */}
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-cyan-500 via-blue-400 to-cyan-500" />

        {/* Subtle diagonal lines pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: `repeating-linear-gradient(45deg, #000 0 1px, transparent 1px 20px)` }}
        />

        <div className="relative px-8 pb-8 pt-10 text-center">
          {/* Skull icon — now vibrant cyan/blue */}
          <div className="mb-4 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-cyan-400/20" style={{ animationDuration: "2s" }} />
              <div className="relative flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-cyan-600 text-white shadow-xl shadow-cyan-500/30 bounce-celebrate">
                <Skull className="size-12" />
                <Shield className="absolute -bottom-1 -right-1 size-8 text-amber-400" style={{ opacity: 0.8 }} />
              </div>
            </div>
          </div>

          {/* Title badge — warm light bg with cyan text */}
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-100 to-blue-100 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-cyan-700">
            <Zap className="size-3.5 text-cyan-500" />
            {t("hm_label")}
          </div>

          {/* Main text — dark for readability on light bg */}
          <div className="mb-2">
            <span className="font-display text-3xl font-bold leading-tight tracking-tight text-zinc-800">
              {t("hm_unlock_title")}
            </span>
          </div>

          <p className="text-sm leading-relaxed text-zinc-600">
            {t("hm_unlock_body")}
          </p>

          {/* Warning badge — warm light bg with cyan text */}
          <div className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-full border border-cyan-300/50 bg-cyan-50/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-700">
            <Shield className="size-3" />
            +4 Hard Questions · Extra EXP
          </div>

          {/* Buttons */}
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleAccept}
              className="bounce-soft flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 font-bold text-white shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40 active:scale-95"
            >
              <Skull className="size-4" />
              {t("hm_unlock_accept")}
            </button>
            <button
              type="button"
              onClick={handleDecline}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white/80 px-6 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 active:scale-95"
            >
              <X className="size-4" />
              {t("hm_unlock_decline")}
            </button>
          </div>

          {/* Unlock condition */}
          <p className="mt-4 text-[10px] text-zinc-400">
            {t("hm_unlock_locked")}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

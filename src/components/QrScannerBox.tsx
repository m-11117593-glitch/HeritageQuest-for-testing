import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, KeyRound, Image as ImageIcon, Circle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { sfx } from "@/lib/sfx";
import { parseArtifactCode } from "@/lib/museum";

interface Props { onScan: (id: string) => void }

export function QrScannerBox({ onScan }: Props) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<unknown>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [decoding, setDecoding] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    return () => { stopCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    setError(null);
    try {
      const mod = await import("qr-scanner");
      const QrScanner = mod.default;
      if (!videoRef.current) return;
      const scanner = new QrScanner(
        videoRef.current,
        (result: { data: string }) => {
          const id = parseArtifactCode(result.data);
          if (!id) { setError(t("scan_invalid")); sfx.error(); return; }
          sfx.scanBeep();
          void scanner.stop();
          onScan(id);
        },
        { returnDetailedScanResult: true, highlightScanRegion: true, highlightCodeOutline: true, maxScansPerSecond: 6 },
      );
      scannerRef.current = scanner;
      await scanner.start();
      setRunning(true);
      sfx.pop();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || t("scan_permission"));
      sfx.error();
    }
  }

  async function handleCapture() {
    const video = videoRef.current;
    if (!video || capturing) return;
    setCapturing(true);
    setError(null);
    try {
      // Create a canvas matching the video dimensions
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 400;
      canvas.height = video.videoHeight || 400;
      const ctx = canvas.getContext("2d");
      if (!ctx) { setError(t("scan_invalid")); sfx.error(); setCapturing(false); return; }
      // Draw the current video frame onto the canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to blob and scan
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/png"),
      );
      if (!blob) { setError(t("scan_invalid")); sfx.error(); setCapturing(false); return; }

      sfx.pop();
      const mod = await import("qr-scanner");
      const QrScanner = mod.default;
      const result = await QrScanner.scanImage(blob, { returnDetailedScanResult: true });
      const raw = typeof result === "string" ? result : result.data;
      const id = parseArtifactCode(raw);
      if (!id) { setError(t("scan_invalid")); sfx.error(); setCapturing(false); return; }
      sfx.scanBeep();
      stopCamera();
      onScan(id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || t("scan_invalid"));
      sfx.error();
    } finally {
      setCapturing(false);
    }
  }

  function stopCamera() {
    const s = scannerRef.current as { stop?: () => void; destroy?: () => void } | null;
    if (s) { try { s.stop?.(); } catch { /* noop */ } try { s.destroy?.(); } catch { /* noop */ } }
    scannerRef.current = null;
    setRunning(false);
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const id = parseArtifactCode(manual);
    if (!id) { setError(t("scan_invalid")); sfx.error(); return; }
    setManual("");
    onScan(id);
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset input so re-selecting the same file still fires change.
    e.target.value = "";
    if (!file) return;
    setError(null);
    setDecoding(true);
    try {
      const mod = await import("qr-scanner");
      const QrScanner = mod.default;
      // scanImage accepts File/Blob/HTMLImageElement and internally rescales
      // large sources (1000x1000 and beyond decode reliably) using its
      // built-in worker + scan-region auto-detection.
      const result = await QrScanner.scanImage(file, { returnDetailedScanResult: true });
      const raw = typeof result === "string" ? result : result.data;
      const id = parseArtifactCode(raw);
      if (!id) { setError(t("scan_invalid")); sfx.error(); return; }
      sfx.scanBeep();
      onScan(id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || t("scan_invalid"));
      sfx.error();
    } finally {
      setDecoding(false);
    }
  }


  return (
    <div className="mx-auto max-w-lg space-y-4">
      {/* Scanner video area — more compact so alternatives are visible above fold */}
      <div className="relative mx-auto aspect-square w-full max-w-[400px] overflow-hidden rounded-2xl border-2 border-border bg-card shadow-[0_12px_30px_-18px_oklch(0.5_0.08_25/0.3)] max-h-[400px]">
        <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
        {!running && (
          <div className="absolute inset-0 grid place-items-center bg-card/90 p-4 text-center">
            <button
              onClick={startCamera}
              className="bounce-soft group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-primary to-gold px-6 py-3 font-bold text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl active:scale-95"
            >
              <div className="grid size-8 place-items-center rounded-full bg-white/20 group-active:scale-90 transition-transform duration-150">
                <Camera className="size-4" />
              </div>
              <span>{t("scan_start")}</span>
            </button>
          </div>
        )}
        {running && (
          <>
            {/* corner brackets */}
            <div className="pointer-events-none absolute inset-4">
              <div className="absolute left-0 top-0 h-6 w-6 rounded-tl-xl border-l-3 border-t-3 border-primary" />
              <div className="absolute right-0 top-0 h-6 w-6 rounded-tr-xl border-r-3 border-t-3 border-primary" />
              <div className="absolute bottom-0 left-0 h-6 w-6 rounded-bl-xl border-b-3 border-l-3 border-primary" />
              <div className="absolute bottom-0 right-0 h-6 w-6 rounded-br-xl border-b-3 border-r-3 border-primary" />
              <div className="absolute inset-0 overflow-hidden rounded-xl">
                <div className="scanline absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
              </div>
            </div>
            <button
              onClick={stopCamera}
              className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-card/90 text-ink shadow"
              title={t("scan_stop")}
            ><CameraOff className="size-3.5" /></button>
            {/* Capture / shutter button */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
              <button
                onClick={handleCapture}
                disabled={capturing}
                className="group flex size-14 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm transition-[transform,box-shadow] duration-150 hover:scale-110 hover:shadow-xl active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                title="Capture"
              >
                {capturing ? (
                  <span className="inline-block size-7 animate-spin rounded-full border-[3px] border-primary/30 border-t-primary" />
                ) : (
                  <Circle className="size-8 fill-primary text-primary" />
                )}
              </button>
            </div>
          </>
        )}
      </div>

      {error && <p className="rounded-2xl border-2 border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive shake">{error}</p>}

      {/* Alternatives — unified card design for upload & manual entry */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={decoding}
        className="flex w-full items-center gap-3 rounded-2xl border-2 border-border bg-card p-3 text-left shadow-sm transition-[transform,border-color,box-shadow] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          {decoding ? (
            <span className="inline-block size-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          ) : (
            <ImageIcon className="size-4" />
          )}
        </span>
        <span className="flex-1 text-sm font-semibold text-ink">
          {decoding ? "…" : t("scan_upload")}
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onPickImage}
      />

      {/* Manual ID entry — same card design */}
      <form onSubmit={submitManual} className="flex items-center gap-3 rounded-2xl border-2 border-border bg-card p-3 shadow-sm transition-[transform,border-color,box-shadow] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <KeyRound className="size-4" />
        </span>
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder={t("scan_manual_placeholder")}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/40"
        />
        <button
          type="submit"
          disabled={!manual.trim()}
          className="bounce-soft shrink-0 rounded-full bg-gradient-to-r from-primary to-gold px-5 py-1.5 text-sm font-bold text-primary-foreground shadow-sm disabled:opacity-50"
        >
          {t("scan_go")}
        </button>
      </form>
      <p className="text-center text-xs text-muted-foreground">{t("scan_manual")}</p>
    </div>
  );
}

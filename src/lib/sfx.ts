// Tiny Web Audio SFX synth — no assets, cute little blips.
// Enhanced with Duolingo-inspired feedback sounds for quizzes.
let ctx: AudioContext | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", vol = 0.15, when = 0) {
  const c = ac(); if (!c || muted) return;
  const t0 = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

/** Duolingo-style correct chime — bright ascending arpeggio */
function correctChime() {
  tone(523.25, 0.09, "sine", 0.10);  // C5
  tone(659.25, 0.09, "sine", 0.11, 0.07);  // E5
  tone(783.99, 0.09, "sine", 0.13, 0.14);  // G5
  tone(1046.5, 0.25, "sine", 0.15, 0.21);  // C6 (held)
  // shimmer overlay
  tone(1318.5, 0.15, "sine", 0.05, 0.28);   // E6
}

/** Combo streak sound — escalates based on streak length */
function comboChime(streak: number) {
  const baseFreq = 523.25 + Math.min(streak - 1, 4) * 60; // C5 + offset per streak
  const vol = Math.min(0.08 + streak * 0.02, 0.18);
  tone(baseFreq, 0.07, "triangle", vol);
  tone(baseFreq * 1.25, 0.07, "triangle", vol, 0.05);
  tone(baseFreq * 1.5, 0.07, "triangle", vol, 0.10);
  // Extra shimmer on 3+ streak
  if (streak >= 3) {
    tone(baseFreq * 2, 0.10, "sine", vol * 0.6, 0.14);
  }
  // Bonus sparkle on 4+ streak
  if (streak >= 4) {
    tone(baseFreq * 2.5, 0.08, "sine", vol * 0.4, 0.18);
  }
}

/** Wrong answer — descending "bwop" with dissonance */
function wrongBuzz() {
  tone(350, 0.12, "square", 0.08);
  tone(280, 0.12, "square", 0.10, 0.06);
  tone(200, 0.10, "sawtooth", 0.07, 0.12);
  tone(150, 0.20, "sawtooth", 0.06, 0.16);
}

/** Vibration (haptic) feedback for mobile devices — silently no-ops if unsupported */
function vibrate(pattern: VibratePattern): void {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch { /* noop */ }
  }
}

export const sfx = {
  setMuted(m: boolean) { muted = m; try { localStorage.setItem("sfx-muted", m ? "1" : "0"); } catch { /* noop */ } },
  isMuted() {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem("sfx-muted") === "1"; } catch { return muted; }
  },
  init() { muted = this.isMuted(); },
  tap()    { tone(660, 0.08, "sine", 0.08); },
  pop()    { tone(520, 0.09, "triangle", 0.1); tone(780, 0.08, "sine", 0.06, 0.04); },
  /** Cheerful ascending chime for correct quiz answers */
  success(){ correctChime(); vibrate(40); },
  /** Escalating combo sound based on streak */
  combo(streak: number) {
    comboChime(streak);
    if (streak >= 4) vibrate([50, 20, 50, 30, 80]);
    else if (streak >= 3) vibrate([40, 20, 60]);
    else if (streak >= 2) vibrate(60);
  },
  /** Ascending celebration for level-ups — bright, triumphant arpeggio with shimmer */
  levelUp(){
    tone(523.25, 0.08, "triangle", 0.12);          // C5
    tone(659.25, 0.08, "triangle", 0.13, 0.07);     // E5
    tone(783.99, 0.08, "triangle", 0.14, 0.14);     // G5
    tone(1046.5, 0.08, "triangle", 0.15, 0.21);     // C6
    tone(1318.5, 0.28, "sine", 0.16, 0.28);          // E6 (held shimmer)
    tone(1567.98, 0.20, "sine", 0.08, 0.32);         // G6 (sparkle)
    vibrate([40, 20, 40, 20, 60]);
  },
  coin()   { tone(987.77, 0.07, "square", 0.08); tone(1318.5, 0.18, "square", 0.09, 0.06); },
  /** Big celebratory fanfare for perfect score */
  fanfare(){ tone(659.25,0.09,"triangle",0.13); tone(880,0.09,"triangle",0.13,0.08); tone(1174.66,0.09,"triangle",0.13,0.16); tone(1567.98,0.35,"triangle",0.15,0.24); vibrate([50, 30, 50, 30, 100]); },
  /** Descending buzz for wrong quiz answers */
  error()  { wrongBuzz(); vibrate([30, 20, 30]); },
  fail()   { tone(330, 0.14, "sawtooth", 0.14); tone(220, 0.28, "sawtooth", 0.14, 0.1); tone(110, 0.4, "sawtooth", 0.12, 0.22); },
  scanBeep(){ tone(1200, 0.05, "square", 0.05); },
};

if (typeof window !== "undefined") sfx.init();

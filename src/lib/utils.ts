import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Maps badge/achievement DB ids to their icon filenames. */
const ACHIEVEMENT_ICON_MAP: Record<string, string> = {
  // Badges
  "penemu-pertama": "penemu-pertama.jpg",
  "ahli-kuest": "ahli-kuest.jpg",
  "separuh-jalan": "separuh-jalan.jpg",
  "peneroka-muzium": "peneroka-muzium.jpg",
  "unique-explorer-weapons": "⚔️",
  "unique-explorer-regalia": "👑",
  "unique-explorer-music": "🎵",
  "unique-explorer-crafts": "🧵",
  "unique-explorer-toys": "🪀",
  "detik-sejarah": "detik-sejarah.jpg",
  "jamuan-budaya": "jamuan-budaya.jpg",
  "jantung-warisan": "jantung-warisan.jpg",
  // Achievements
  "ach-first-scan": "first-scan.jpg",
  "ach-scan-5": "5-scaned.jpg",
  "ach-scan-10": "10-scaned.jpg",
  "ach-scan-all": "all-scaned.jpg",
  "ach-level-5": "level-up-5.jpg",
  "ach-level-10": "level-up-10.jpg",
  "ach-uq-1": "first-quest.jpg",
  "ach-uq-all": "quest-master.jpg",
  "ach-perfect-quiz": "perfect-quiz-3.jpg",
  "ach-teka-sahih": "teka-sahih.jpg",
  "ach-social-top": "social-top.jpg",
  // Hard mode badges
  "pencabar-sukar": "pencabar-sukar.jpg",
  "pemikir-tajam": "pemikir-tajam.jpg",
  "kebal-cabaran": "kebal-cabaran.jpg",
  "mahir-sukar": "mahir-sukar.jpg",
  "legenda-sukar": "legenda-sukar.jpg",
  // Hard mode achievements
  "h-quiz-first": "h-quiz-first.jpg",
  "h-quiz-five": "h-quiz-five.jpg",
  "h-quiz-all": "h-quiz-all.jpg",
  "h-perfect-one": "h-quiz-perfect-one.jpg",
  "h-perfect-three": "h-quiz-perfect-three.jpg",
  "h-streak-3": "h-streak-3.jpg",
  "h-streak-5": "h-streak-5.jpg",
  "h-total-30": "h-quiz-total-30.jpg",
  "h-total-60": "h-quiz-total-60.jpg",
  "h-total-100": "h-quiz-total-100.jpg",
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolves an achievement or badge icon to a filename for rendering.
 *
 * Looks up `id` in the icon mapping to replace the DB-stored emoji with a
 * JPEG filename. Falls back to the original `icon` string (emoji) if no
 * mapping found.
 */
export function resolveAchievementIcon(icon: string, id?: string): string {
  // Look up by ID if provided
  if (id && ACHIEVEMENT_ICON_MAP[id]) {
    return ACHIEVEMENT_ICON_MAP[id];
  }
  // Fall back to original icon (emoji)
  return icon;
}

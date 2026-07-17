import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase as supabaseClient } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { levelForExp, HARD_QUEST_BONUS, POINTS_PER_LEVEL, TOTAL_ARTIFACTS } from "./museum";

// Re-using the same result shape so the UI (ArtifactModal, ScanPage)
// doesn't need to change its data-handling logic.
export interface ScanResult {
  alreadyScanned: boolean;
  expGained: number;
  totalExp: number;
  level: number;
  levelUps: number;
  pointsGained: number;
  totalPoints: number;
  newBadges: string[];
  newQuests: string[];
  newAchievements: string[];
  quizCorrectCount: number | null;
  quizTotalQuestions: number | null;
  hardCorrectBonus: boolean;
  uniqueQuest: null | {
    kind: "activeCorrect" | "activeCorrectComplete" | "activeWrongFail";
    templateId: string;
    correctScans: number;
    targetCount: number;
    bonusExp?: number;
    penaltyExp?: number;
  };
  offeredUniqueQuest: null | {
    templateId: string;
    name_bm: string;
    name_en: string;
    description_bm: string;
    description_en: string;
    target_category: string;
    target_count: number;
    reward_multiplier: number;
    penalty_exp: number;
  };
  artifact: {
    id: string;
    category: string;
    name_bm: string;
    name_en: string;
    description_bm: string;
    description_en: string;
    era_bm: string;
    era_en: string;
    origin_bm: string;
    origin_en: string;
    material_bm: string;
    material_en: string;
    image_url: string | null;
    sort_order: number;
  };
}

// ---------- scanArtifact ----------

const scanInput = z.object({ 
  artifactId: z.string().min(1),
  correctCount: z.number().min(0).max(10).optional(),
  totalQuestions: z.number().min(0).max(10).optional(),
  hardCorrect: z.boolean().optional(),
  isHardMode: z.boolean().optional()
});

export const scanArtifact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => scanInput.parse(d))
  .handler(async ({ data, context }): Promise<ScanResult> => {
    const { supabase, userId } = context;

    const { data: artifact, error: aErr } = await supabase
      .from("artifacts")
      .select("id, category, name_bm, name_en, description_bm, description_en, era_bm, era_en, origin_bm, origin_en, material_bm, material_en, image_url, sort_order")
      .eq("id", data.artifactId)
      .maybeSingle();
    if (aErr) throw new Error(aErr.message);
    if (!artifact) throw new Error("ARTIFACT_NOT_FOUND");

    const [
      { data: prog },
      { data: prior },
      { data: earnedBadges },
      { data: doneQuests },
      { data: earnedAchievements },
      { data: uqTemplatesAll },
      { data: userUq },
    ] = await Promise.all([
      supabase.from("user_progress").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_artifact_progress").select("*").eq("user_id", userId).eq("artifact_id", data.artifactId).maybeSingle(),
      supabase.from("user_badges").select("badge_id").eq("user_id", userId),
      supabase.from("user_quests").select("quest_id").eq("user_id", userId),
      supabase.from("user_achievements").select("achievement_id").eq("user_id", userId),
      supabase.from("unique_quest_templates").select("*"),
      supabase.from("user_unique_quests").select("*").eq("user_id", userId),
    ]);

    const alreadyScanned = !!prior;
    const quizDone = prior?.quiz_correct_count !== null && prior?.quiz_correct_count !== undefined;
    const oldExp = prog?.total_exp ?? 0;
    const oldLevel = prog?.current_level ?? 1;
    const oldPoints = prog?.discount_points ?? 0;

    // Idempotent short circuit if BOTH scan and quiz are done.
    if (alreadyScanned && (quizDone || data.correctCount === undefined)) {
      return {
        alreadyScanned: true,
        expGained: 0,
        totalExp: oldExp,
        level: oldLevel,
        levelUps: 0,
        pointsGained: 0,
        totalPoints: oldPoints,
        newBadges: [],
        newQuests: [],
        newAchievements: [],
        quizCorrectCount: prior?.quiz_correct_count ?? null,
        quizTotalQuestions: prior?.quiz_total_questions ?? null,
        hardCorrectBonus: false,
        uniqueQuest: null,
        offeredUniqueQuest: null,
        artifact,
      };
    }

    // Determine EXP. 
    let expEarned = 0;
    if (!alreadyScanned) expEarned += 10; // Discovery bonus
    if (data.correctCount !== undefined && !quizDone) {
      expEarned += data.correctCount * 10;
      // Bonus EXP for answering the hard (Q5) question correctly
      if (data.hardCorrect) {
        expEarned += HARD_QUEST_BONUS;
      }
    }

    const newBadges: string[] = [];
    const newAchievements: string[] = [];
    let uqSummary: ScanResult["uniqueQuest"] = null;

    // --- Active unique quest branch ---
    const activeUq = (userUq ?? []).find((u) => u.status === "active");
    const activeTemplate = activeUq ? (uqTemplatesAll ?? []).find((t) => t.id === activeUq.template_id) : null;

    if (activeUq && activeTemplate) {
      if (artifact.category === activeTemplate.target_category && artifact.id !== activeTemplate.trigger_artifact_id) {
        // Correct
        const bonus = 10 * activeTemplate.reward_multiplier; // Use 10 as base for UQ bonus
        expEarned += bonus;
        const nextCorrect = (activeUq.correct_scans ?? 0) + 1;
        const complete = nextCorrect >= activeTemplate.target_count;
        await supabase.from("user_unique_quests").update({
          correct_scans: nextCorrect,
          status: complete ? "completed" : "active",
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId).eq("template_id", activeTemplate.id);
        if (complete && activeTemplate.badge_id) newBadges.push(activeTemplate.badge_id);
        uqSummary = {
          kind: complete ? "activeCorrectComplete" : "activeCorrect",
          templateId: activeTemplate.id,
          correctScans: nextCorrect,
          targetCount: activeTemplate.target_count,
          bonusExp: bonus,
        };
      } else if (artifact.id !== activeTemplate.trigger_artifact_id) {
        // Wrong category — fail
        expEarned -= activeTemplate.penalty_exp;
        await supabase.from("user_unique_quests").update({
          status: "failed",
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId).eq("template_id", activeTemplate.id);
        uqSummary = {
          kind: "activeWrongFail",
          templateId: activeTemplate.id,
          correctScans: activeUq.correct_scans ?? 0,
          targetCount: activeTemplate.target_count,
          penaltyExp: activeTemplate.penalty_exp,
        };
      }
    }

    // Insert or Update scan record
    if (!alreadyScanned) {
      const { error: insErr } = await supabase
        .from("user_artifact_progress")
        .insert({ 
          user_id: userId, 
          artifact_id: artifact.id, 
          exp_earned: expEarned,
          quiz_correct_count: data.correctCount ?? null,
          quiz_total_questions: data.totalQuestions ?? (data.correctCount !== undefined ? 5 : null),
          quiz_completed_at: data.correctCount !== undefined ? new Date().toISOString() : null,
          is_hard_mode: data.isHardMode ?? false
        });
      if (insErr) throw new Error(insErr.message);
    } else if (data.correctCount !== undefined && !quizDone) {
      const { error: updErr } = await supabase
        .from("user_artifact_progress")
        .update({ 
          exp_earned: (prior.exp_earned ?? 0) + expEarned,
          quiz_correct_count: data.correctCount,
          quiz_total_questions: data.totalQuestions ?? 5,
          quiz_completed_at: new Date().toISOString(),
          is_hard_mode: data.isHardMode ?? false
        })
        .eq("user_id", userId)
        .eq("artifact_id", artifact.id);
      if (updErr) throw new Error(updErr.message);
    }

    // Refresh scanned status for quests
    const { data: currentPrior } = await supabase.from("user_artifact_progress").select("artifact_id").eq("user_id", userId);
    const scannedIds = new Set((currentPrior ?? []).map((r) => r.artifact_id));

    // --- Category & grand quests (normal) ---
    const newQuests: string[] = [];
    const doneQuestIds = new Set((doneQuests ?? []).map((q) => q.quest_id));
    const { data: catArtifacts } = await supabase.from("artifacts").select("id").eq("category", artifact.category);
    const catIds = (catArtifacts ?? []).map((a) => a.id);
    const catComplete = catIds.length > 0 && catIds.every((id) => scannedIds.has(id));
    const catQuestId = `quest-${artifact.category}`;
    if (catComplete && !doneQuestIds.has(catQuestId)) {
      newQuests.push(catQuestId);
      expEarned += 50;
    }
    if (scannedIds.size === TOTAL_ARTIFACTS && !doneQuestIds.has("quest-grand")) {
      newQuests.push("quest-grand");
      expEarned += 100;
    }
    if (newQuests.length) {
      await supabase.from("user_quests").insert(newQuests.map((quest_id) => ({ user_id: userId, quest_id })));
    }

    // Hard mode flags & cumulative stats — needed by badge & achievement checks below
    const isHardMode = data.isHardMode ?? false;
    const { data: allQuizData } = await supabase
      .from("user_artifact_progress")
      .select("quiz_correct_count, quiz_total_questions, is_hard_mode")
      .eq("user_id", userId)
      .not("quiz_correct_count", "is", null);
    const hardQuizRows = (allQuizData ?? []).filter((q) => q.is_hard_mode === true);
    const hardQuizzesDone = hardQuizRows.length;
    const hardTotalCorrect = hardQuizRows.reduce(
      (sum, q) => sum + (q.quiz_correct_count ?? 0), 0
    );
    // Compute max streak in hard mode: sort by scanned_at chronologically
    const { data: hardQuizChrono } = await supabase
      .from("user_artifact_progress")
      .select("quiz_correct_count, quiz_total_questions, scanned_at")
      .eq("user_id", userId)
      .eq("is_hard_mode", true)
      .not("quiz_correct_count", "is", null)
      .order("scanned_at", { ascending: true });
    let hardMaxStreak = 0;
    if (hardQuizChrono) {
      let currentRun = 0;
      for (const row of hardQuizChrono) {
        if (row.quiz_correct_count != null && row.quiz_correct_count === row.quiz_total_questions) {
          currentRun++;
          if (currentRun > hardMaxStreak) hardMaxStreak = currentRun;
        } else {
          currentRun = 0;
        }
      }
    }

    // --- Level & points ---
    const newExp = Math.max(0, oldExp + expEarned);
    const newLevel = levelForExp(newExp);
    const levelUps = Math.max(0, newLevel - oldLevel);
    const pointsGained = levelUps * POINTS_PER_LEVEL;
    const newPoints = oldPoints + pointsGained;

    await supabase.from("user_progress").update({
      total_exp: newExp,
      current_level: newLevel,
      discount_points: newPoints,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);

    // --- Badges ---
    const earnedBadgeIds = new Set((earnedBadges ?? []).map((b) => b.badge_id));
    const scanCount = scannedIds.size;
    if (!earnedBadgeIds.has("penemu-pertama")) newBadges.push("penemu-pertama");
    if (!earnedBadgeIds.has("ahli-kuest") && (newQuests.some((q) => q.startsWith("quest-") && q !== "quest-grand") || [...doneQuestIds].some((q) => q.startsWith("quest-") && q !== "quest-grand"))) {
      newBadges.push("ahli-kuest");
    }
    if (scanCount >= 8 && !earnedBadgeIds.has("separuh-jalan")) newBadges.push("separuh-jalan");
    if (scanCount === TOTAL_ARTIFACTS && !earnedBadgeIds.has("peneroka-muzium")) newBadges.push("peneroka-muzium");

    // --- Hard mode badges ---
    // (only awarded when a hard mode quiz was just completed)
    if (isHardMode && data.correctCount !== undefined && !quizDone) {
      if (!earnedBadgeIds.has("pencabar-sukar")) newBadges.push("pencabar-sukar");
      if (data.correctCount >= 7 && !earnedBadgeIds.has("pemikir-tajam")) newBadges.push("pemikir-tajam");
      if (data.correctCount === data.totalQuestions && !earnedBadgeIds.has("mahir-sukar")) newBadges.push("mahir-sukar");
      // kebal-cabaran: 3 consecutive perfect hard mode quizzes
      if (hardMaxStreak >= 3 && !earnedBadgeIds.has("kebal-cabaran")) newBadges.push("kebal-cabaran");
      // legenda-sukar: all 15 hard mode quizzes done
      if (hardQuizzesDone >= 15 && !earnedBadgeIds.has("legenda-sukar")) newBadges.push("legenda-sukar");
    }

    const badgesToInsert = [...new Set(newBadges)].filter((b) => !earnedBadgeIds.has(b));
    if (badgesToInsert.length) {
      await supabase.from("user_badges").insert(badgesToInsert.map((badge_id) => ({ user_id: userId, badge_id })));
    }

    // --- Achievements ---
    const uqDoneCount = (userUq ?? []).filter((u) => u.status === "completed").length + (uqSummary?.kind === "activeCorrectComplete" ? 1 : 0);
    const earnedAchIds = new Set((earnedAchievements ?? []).map((a) => a.achievement_id));
    const { data: allAch } = await supabase.from("achievements").select("*");

    // Compute normal-mode stats from allQuizData (already fetched above)
    const perfectQuizzes = (allQuizData ?? []).filter(
      (q) => q.quiz_correct_count != null && q.quiz_correct_count === q.quiz_total_questions
    ).length;
    const totalCorrect = (allQuizData ?? []).reduce(
      (sum, q) => sum + (q.quiz_correct_count ?? 0), 0
    );
    const hardPerfectCount = hardQuizRows.filter(
      (q) => q.quiz_correct_count != null && q.quiz_correct_count === q.quiz_total_questions
    ).length;

    // Compute user's leaderboard rank — only if there's a leaderboard_rank achievement still unearned
    let leaderboardRank: number | null = null;
    const needsRank = (allAch ?? []).some(
      (a) => a.requirement_key === "leaderboard_rank" && !earnedAchIds.has(a.id)
    );
    if (needsRank) {
      const { data: allProgressSorted } = await supabase
        .from("user_progress")
        .select("user_id, total_exp")
        .order("total_exp", { ascending: false });
      if (allProgressSorted) {
        const idx = allProgressSorted.findIndex((p) => p.user_id === userId);
        if (idx !== -1) leaderboardRank = idx + 1;
      }
    }

    for (const a of allAch ?? []) {
      if (earnedAchIds.has(a.id)) continue;
      let ok = false;
      if (a.requirement_key === "scans") ok = scanCount >= a.requirement_value;
      else if (a.requirement_key === "level") ok = newLevel >= a.requirement_value;
      else if (a.requirement_key === "unique_quests") ok = uqDoneCount >= a.requirement_value;
      else if (a.requirement_key === "perfect_quizzes") ok = perfectQuizzes >= a.requirement_value;
      else if (a.requirement_key === "total_correct") ok = totalCorrect >= a.requirement_value;
      else if (a.requirement_key === "leaderboard_rank") ok = leaderboardRank !== null && leaderboardRank <= a.requirement_value;
      // Hard mode achievement keys
      else if (a.requirement_key === "hard_quizzes") ok = hardQuizzesDone >= a.requirement_value;
      else if (a.requirement_key === "hard_perfect") ok = hardPerfectCount >= a.requirement_value;
      else if (a.requirement_key === "hard_streak") ok = hardMaxStreak >= a.requirement_value;
      else if (a.requirement_key === "hard_total_correct") ok = hardTotalCorrect >= a.requirement_value;
      if (ok) newAchievements.push(a.id);
    }
    if (newAchievements.length) {
      await supabase.from("user_achievements").insert(newAchievements.map((achievement_id) => ({ user_id: userId, achievement_id })));
    }

    // --- Offered unique quest? ---
    let offered: ScanResult["offeredUniqueQuest"] = null;
    const alreadyHasActive = !!(userUq ?? []).find((u) => u.status === "active");
    const wasAnyActive = alreadyHasActive || !!activeUq;
    if (!wasAnyActive && uqSummary === null) {
      const tmpl = (uqTemplatesAll ?? []).find((t) => t.trigger_artifact_id === artifact.id);
      if (tmpl) {
        const already = (userUq ?? []).find((u) => u.template_id === tmpl.id);
        if (!already) {
          offered = {
            templateId: tmpl.id,
            name_bm: tmpl.name_bm,
            name_en: tmpl.name_en,
            description_bm: tmpl.description_bm,
            description_en: tmpl.description_en,
            target_category: tmpl.target_category,
            target_count: tmpl.target_count,
            reward_multiplier: tmpl.reward_multiplier,
            penalty_exp: tmpl.penalty_exp,
          };
        }
      }
    }

    return {
      alreadyScanned,
      expGained: expEarned,
      totalExp: newExp,
      level: newLevel,
      levelUps,
      pointsGained,
      totalPoints: newPoints,
      newBadges: badgesToInsert,
      newQuests,
      newAchievements,
      quizCorrectCount: data.correctCount ?? (prior?.quiz_correct_count ?? null),
      quizTotalQuestions: data.totalQuestions ?? (data.correctCount !== undefined ? 5 : (prior?.quiz_total_questions ?? null)),
      hardCorrectBonus: data.hardCorrect === true,
      uniqueQuest: uqSummary,
      offeredUniqueQuest: offered,
      artifact,
    };
  });

// ---------- Unique quest accept/decline ----------

const uqInput = z.object({ templateId: z.string().min(1) });

export const acceptUniqueQuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => uqInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: mine } = await supabase.from("user_unique_quests").select("*").eq("user_id", userId);
    if ((mine ?? []).some((r) => r.status === "active")) {
      return { ok: false as const, reason: "another_active" as const };
    }
    const existing = (mine ?? []).find((r) => r.template_id === data.templateId);
    if (existing) return { ok: false as const, reason: "already_seen" as const };
    const { error } = await supabase.from("user_unique_quests").insert({
      user_id: userId,
      template_id: data.templateId,
      status: "active",
      correct_scans: 0,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const declineUniqueQuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => uqInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const existing = await supabase.from("user_unique_quests").select("*").eq("user_id", userId).eq("template_id", data.templateId).maybeSingle();
    if (existing.data) return { ok: true as const };
    const { error } = await supabase.from("user_unique_quests").insert({
      user_id: userId,
      template_id: data.templateId,
      status: "declined",
      correct_scans: 0,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// ---------- leaderboard ----------

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  level: number;
  totalExp: number;
  scanCount: number;
  badgesCount: number;
  rewardPoints?: number;
  isDemo?: boolean;
}

export interface SeasonInfo {
  id: string;
  name_bm: string;
  name_en: string;
  seasonType: "weekly" | "monthly";
  startDate: string;
  endDate: string;
  status: "active" | "finalized";
}

export interface SeasonWinner {
  rank: number;
  username: string;
  totalExp: number;
  rewardPoints: number;
}

export interface SeasonHistoryEntry {
  id: string;
  name_bm: string;
  name_en: string;
  seasonType: "weekly" | "monthly";
  startDate: string;
  endDate: string;
  winners: SeasonWinner[];
}

// Reward points for top 3 leaderboard positions
const SEASON_REWARDS = [15, 10, 5] as const;

// Demo users to keep the leaderboard lively when few real users exist
const DEMO_USERS = [
  { username: "Pengembara1",  totalExp: 580, level: 5, scanCount: 15, badgesCount: 4 },
  { username: "JelajahSetia",  totalExp: 520, level: 5, scanCount: 14, badgesCount: 4 },
  { username: "WarisanKu",    totalExp: 460, level: 4, scanCount: 13, badgesCount: 3 },
  { username: "BudayaAbadi",  totalExp: 400, level: 4, scanCount: 12, badgesCount: 3 },
  { username: "SejarahMuda",  totalExp: 340, level: 4, scanCount: 11, badgesCount: 3 },
] as const;

/**
 * Ensure the current active season exists. If the current season has expired,
 * finalize it, distribute rewards, and create the next season.
 * Uses optimistic concurrency to avoid double-finalization in race conditions.
 * Returns the current (active) season.
 */
async function ensureCurrentSeason(supabaseAdmin: any): Promise<SeasonInfo> {
  const sa = supabaseAdmin as any;

  // Find the active season
  const { data: activeSeason } = await sa
    .from("leaderboard_seasons")
    .select("*")
    .eq("status", "active")
    .maybeSingle();

  const now = new Date();

  // Case 1: No active season — check if one was recently created (race condition guard),
  // or create a brand new one.
  if (!activeSeason) {
    // Check if a season was already created within the last minute (concurrent request beat us)
    const recentThreshold = new Date(now.getTime() - 60_000).toISOString();
    const { data: recentSeason } = await sa
      .from("leaderboard_seasons")
      .select("*")
      .gte("created_at", recentThreshold)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentSeason) {
      return {
        id: recentSeason.id,
        name_bm: recentSeason.name_bm,
        name_en: recentSeason.name_en,
        seasonType: recentSeason.season_type,
        startDate: recentSeason.start_date,
        endDate: recentSeason.end_date,
        status: recentSeason.status,
      };
    }

    // No recent season found — create one
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    const { data: newSeason } = await sa
      .from("leaderboard_seasons")
      .insert({
        name_bm: `Musim ${now.toISOString().slice(0, 10)}`,
        name_en: `Season ${now.toISOString().slice(0, 10)}`,
        season_type: "weekly",
        start_date: now.toISOString(),
        end_date: end.toISOString(),
        status: "active",
      })
      .select()
      .single();
    if (!newSeason) throw new Error("Failed to create new season");
    return {
      id: newSeason.id,
      name_bm: newSeason.name_bm,
      name_en: newSeason.name_en,
      seasonType: newSeason.season_type,
      startDate: newSeason.start_date,
      endDate: newSeason.end_date,
      status: newSeason.status,
    };
  }

  const endDate = new Date(activeSeason.end_date);

  // If the season is still active and not expired, return it
  if (now < endDate) {
    return {
      id: activeSeason.id,
      name_bm: activeSeason.name_bm,
      name_en: activeSeason.name_en,
      seasonType: activeSeason.season_type,
      startDate: activeSeason.start_date,
      endDate: activeSeason.end_date,
      status: activeSeason.status,
    };
  }

  // Case 2: Season has expired — finalize it with optimistic concurrency.
  // Only finalize if the season is still 'active' (another request may have beaten us).
  const { data: frozenSeason } = await sa
    .from("leaderboard_seasons")
    .update({ status: "finalized", finalized_at: now.toISOString() })
    .eq("id", activeSeason.id)
    .eq("status", "active")
    .select()
    .maybeSingle();

  // If update didn't affect any row (frozenSeason is null), another request already finalized
  if (!frozenSeason) {
    // Fetch the next active season that should exist
    const { data: nextSeason } = await sa
      .from("leaderboard_seasons")
      .select("*")
      .eq("status", "active")
      .maybeSingle();

    if (nextSeason) {
      return {
        id: nextSeason.id,
        name_bm: nextSeason.name_bm,
        name_en: nextSeason.name_en,
        seasonType: nextSeason.season_type,
        startDate: nextSeason.start_date,
        endDate: nextSeason.end_date,
        status: nextSeason.status,
      };
    }

    // Fallback: no next season exists yet (very brief race window), create one
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    const { data: newFallback } = await sa
      .from("leaderboard_seasons")
      .insert({
        name_bm: `Musim ${now.toISOString().slice(0, 10)}`,
        name_en: `Season ${now.toISOString().slice(0, 10)}`,
        season_type: "weekly",
        start_date: now.toISOString(),
        end_date: end.toISOString(),
        status: "active",
      })
      .select()
      .single();
    if (!newFallback) throw new Error("Failed to create fallback season");
    return {
      id: newFallback.id,
      name_bm: newFallback.name_bm,
      name_en: newFallback.name_en,
      seasonType: newFallback.season_type,
      startDate: newFallback.start_date,
      endDate: newFallback.end_date,
      status: newFallback.status,
    };
  }

  // We successfully finalized this season — compute rankings, distribute rewards, create next
  const [{ data: profiles }, { data: progress }, { data: scans }, { data: badges }] = await Promise.all([
    sa.from("profiles").select("id, username"),
    sa.from("user_progress").select("user_id, total_exp, current_level, discount_points"),
    sa.from("user_artifact_progress").select("user_id"),
    sa.from("user_badges").select("user_id"),
  ]);

  const progressMap = new Map<string, any>((progress ?? []).map((p: any) => [p.user_id, p]));
  const scanCountMap = new Map<string, number>();
  for (const s of scans ?? []) scanCountMap.set(s.user_id, (scanCountMap.get(s.user_id) ?? 0) + 1);
  const badgeCountMap = new Map<string, number>();
  for (const b of badges ?? []) badgeCountMap.set(b.user_id, (badgeCountMap.get(b.user_id) ?? 0) + 1);

  // Build and sort entries
  const allEntries: Array<{ userId: string; username: string; totalExp: number; level: number; scanCount: number; badgeCount: number }> = [];
  for (const p of profiles ?? []) {
    const prog: any = progressMap.get(p.id);
    if (!prog) continue;
    allEntries.push({
      userId: p.id,
      username: p.username,
      totalExp: prog.total_exp,
      level: prog.current_level,
      scanCount: scanCountMap.get(p.id) ?? 0,
      badgeCount: badgeCountMap.get(p.id) ?? 0,
    });
  }
  allEntries.sort((a, b) => b.totalExp - a.totalExp);

  // Assign rewards to top 3 and insert season entries
  const seasonEntries = allEntries.map((e, i) => ({
    season_id: activeSeason.id,
    user_id: e.userId,
    rank: i + 1,
    total_exp: e.totalExp,
    level: e.level,
    scan_count: e.scanCount,
    badge_count: e.badgeCount,
    reward_points: i < 3 ? SEASON_REWARDS[i] : 0,
  }));

  await sa.from("leaderboard_season_entries").insert(seasonEntries);

  // Distribute rewards to top 3 (parallel for robustness)
  await Promise.all(
    allEntries.slice(0, 3).map(async (entry, i) => {
      const reward = SEASON_REWARDS[i];
      const prog: any = progressMap.get(entry.userId);
      if (prog) {
        await sa
          .from("user_progress")
          .update({ discount_points: (prog.discount_points ?? 0) + reward })
          .eq("user_id", entry.userId);
      }
    })
  );

  // Get next season number
  const { count: seasonCount } = await sa
    .from("leaderboard_seasons")
    .select("*", { count: "exact", head: true });
  const nextSeasonNumber = (seasonCount ?? 0) + 1;

  // Create the next season
  const nextStart = new Date(endDate);
  const nextEnd = new Date(nextStart);
  nextEnd.setDate(nextEnd.getDate() + 7);

  const { data: newSeason } = await sa
    .from("leaderboard_seasons")
    .insert({
      name_bm: `Musim ${nextSeasonNumber}`,
      name_en: `Season ${nextSeasonNumber}`,
      season_type: "weekly",
      start_date: nextStart.toISOString(),
      end_date: nextEnd.toISOString(),
      status: "active",
    })
    .select()
    .single();

  if (!newSeason) throw new Error("Failed to create next season");

  return {
    id: newSeason.id,
    name_bm: newSeason.name_bm,
    name_en: newSeason.name_en,
    seasonType: newSeason.season_type,
    startDate: newSeason.start_date,
    endDate: newSeason.end_date,
    status: newSeason.status,
  };
}

export const getCurrentSeason = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<SeasonInfo> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return ensureCurrentSeason(supabaseAdmin);
  });

export const getSeasonHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async (): Promise<SeasonHistoryEntry[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa = supabaseAdmin as any;

    const { data: seasons } = await sa
      .from("leaderboard_seasons")
      .select("*")
      .eq("status", "finalized")
      .order("end_date", { ascending: false });

    if (!seasons || seasons.length === 0) return [];

    const seasonIds = seasons.map((s: any) => s.id);
    const { data: entries } = await sa
      .from("leaderboard_season_entries")
      .select("*")
      .in("season_id", seasonIds)
      .order("season_id")
      .order("rank");

    const { data: profiles } = await sa
      .from("profiles")
      .select("id, username");

    const profileMap = new Map<string, any>((profiles ?? []).map((p: any) => [p.id, p]));

    return seasons.map((season: any) => {
      const seasonEntries = (entries ?? []).filter((e: any) => e.season_id === season.id);
      const topThree = seasonEntries.filter((e: any) => e.rank <= 3);
      return {
        id: season.id,
        name_bm: season.name_bm,
        name_en: season.name_en,
        seasonType: season.season_type,
        startDate: season.start_date,
        endDate: season.end_date,
        winners: topThree.map((e: any) => ({
          rank: e.rank,
          username: profileMap.get(e.user_id)?.username ?? "???",
          totalExp: e.total_exp,
          rewardPoints: e.reward_points,
        })),
      };
    });
  });

export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{
    entries: LeaderboardEntry[];
    userRank: number | null;
    season: SeasonInfo | null;
  }> => {
    const { userId, supabase } = context;

    // Demo usernames from the seed migration — used to detect demo users and guard injection
    const demoUsernames: string[] = DEMO_USERS.map((d) => d.username);

    let season: SeasonInfo | null = null;
    let entries: LeaderboardEntry[] = [];

    // Helper: query leaderboard data from a given db client
    async function queryFromClient(client: any): Promise<void> {
      const [{ data: profiles }, { data: progress }, { data: scans }, { data: badges }] = await Promise.all([
        client.from("profiles").select("id, username"),
        client.from("user_progress").select("user_id, total_exp, current_level"),
        client.from("user_artifact_progress").select("user_id"),
        client.from("user_badges").select("user_id"),
      ]);

      const progressMap = new Map((progress ?? []).map((p: any) => [p.user_id, p]));
      const scanCountMap = new Map<string, number>();
      for (const s of scans ?? []) scanCountMap.set(s.user_id, (scanCountMap.get(s.user_id) ?? 0) + 1);
      const badgeCountMap = new Map<string, number>();
      for (const b of badges ?? []) badgeCountMap.set(b.user_id, (badgeCountMap.get(b.user_id) ?? 0) + 1);

      for (const p of profiles ?? []) {
        const prog = progressMap.get(p.id) as { current_level: number; total_exp: number } | undefined;
        if (!prog) continue;
        entries.push({
          rank: 0,
          userId: p.id,
          username: p.username,
          level: prog.current_level,
          totalExp: prog.total_exp,
          scanCount: scanCountMap.get(p.id) ?? 0,
          badgesCount: badgeCountMap.get(p.id) ?? 0,
          isDemo: demoUsernames.includes(p.username),
        });
      }
    }

    // Try supabaseAdmin first (bypasses RLS), fall back to authenticated supabase client
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      // Ensure season is up-to-date (auto-finalize if expired).
      // Gracefully handle missing table (migration not yet applied).
      try {
        season = await ensureCurrentSeason(supabaseAdmin);
      } catch (e) {
        console.warn("[getLeaderboard] Could not load season via supabaseAdmin — season table may not exist:", e);
      }

      await queryFromClient(supabaseAdmin);
    } catch (e) {
      console.warn("[getLeaderboard] supabaseAdmin failed — falling back to context supabase client:", e);
      // Fall back to the authenticated context supabase client
      try {
        await queryFromClient(supabase);
      } catch (e2) {
        console.warn("[getLeaderboard] Context supabase also failed — using demo fallback:", e2);
      }
    }

    // If the current user isn't in entries yet, fetch their data directly from context supabase
    // This guarantees the user always appears even when supabaseAdmin or generic queries fail
    if (!entries.some((e) => e.userId === userId)) {
      try {
        const [{ data: myProfile }, { data: myProgress }] = await Promise.all([
          supabase.from("profiles").select("id, username").eq("id", userId).maybeSingle(),
          supabase.from("user_progress").select("user_id, total_exp, current_level").eq("user_id", userId).maybeSingle(),
        ]);

        if (myProfile && myProgress) {
          // Count scans & badges for this user
          const { data: myScans } = await supabase
            .from("user_artifact_progress")
            .select("user_id")
            .eq("user_id", userId);
          const { data: myBadges } = await supabase
            .from("user_badges")
            .select("user_id")
            .eq("user_id", userId);

          entries.push({
            rank: 0,
            userId: myProfile.id,
            username: myProfile.username,
            level: myProgress.current_level,
            totalExp: myProgress.total_exp,
            scanCount: (myScans ?? []).length,
            badgesCount: (myBadges ?? []).length,
          });
        }
      } catch (e) {
        console.warn("[getLeaderboard] Could not fetch current user data for leaderboard:", e);
      }
    }

    // Only inject fallback demo users if we have fewer than 7 entries.
    if (entries.length < 7) {
      const realDemoExists = entries.some((e) => demoUsernames.includes(e.username));

      if (!realDemoExists) {
        for (let i = 0; i < DEMO_USERS.length; i++) {
          const demo = DEMO_USERS[i];
          const demoId = `demo-${i + 1}`;
          if (entries.some((e) => e.username === demo.username)) continue;
          entries.push({
            rank: 0,
            userId: demoId,
            username: demo.username,
            level: demo.level,
            totalExp: demo.totalExp,
            scanCount: demo.scanCount,
            badgesCount: demo.badgesCount,
            isDemo: true,
          });
        }
      }
    }

    entries.sort((a, b) => b.totalExp - a.totalExp);
    entries.forEach((e, i) => { e.rank = i + 1; });

    const userEntry = entries.find((e) => e.userId === userId);
    return { entries, userRank: userEntry?.rank ?? null, season };
  });

// ---------- redeemSouvenir (kept from before) ----------

const redeemInput = z.object({ souvenirId: z.string().min(1) });

export const redeemSouvenir = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => redeemInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: souv, error: sErr } = await supabase
      .from("souvenirs")
      .select("id, cost_points")
      .eq("id", data.souvenirId)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!souv) throw new Error("Souvenir not found");

    const { data: prog, error: pErr } = await supabase
      .from("user_progress")
      .select("discount_points")
      .eq("user_id", userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    const balance = prog?.discount_points ?? 0;
    if (balance < souv.cost_points) {
      return { ok: false as const, reason: "insufficient", balance };
    }
    const newBalance = balance - souv.cost_points;
    const { error: uErr } = await supabase
      .from("user_progress")
      .update({ discount_points: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (uErr) throw new Error(uErr.message);
    const { error: rErr } = await supabase
      .from("redemptions")
      .insert({ user_id: userId, souvenir_id: souv.id, points_spent: souv.cost_points });
    if (rErr) throw new Error(rErr.message);
    return { ok: true as const, balance: newBalance };
  });

// ---------- Public Profile (bypasses RLS for friend viewing) ----------

export interface PublicProfileData {
  username: string;
  exp: number;
  level: number;
  scanCount: number;
  badgeCount: number;
  achCount: number;
  badges: any[];
  achievements: any[];
}

const publicProfileInput = z.object({ userId: z.string().min(1) });

export const getPublicProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => publicProfileInput.parse(d))
  .handler(async ({ data }): Promise<PublicProfileData | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa: any = supabaseAdmin;

    const rawProfile: any = await sa.from("profiles").select("username").eq("id", data.userId).maybeSingle();
    if (!rawProfile?.data) return null;

    const rawProg: any = await sa.from("user_progress").select("total_exp, current_level").eq("user_id", data.userId).maybeSingle();
    const rawScans: any = await sa.from("user_artifact_progress").select("artifact_id").eq("user_id", data.userId);
    const rawBadges: any = await sa.from("user_badges").select("badge_id, earned_at").eq("user_id", data.userId);
    const rawAch: any = await sa.from("user_achievements").select("achievement_id, earned_at").eq("user_id", data.userId);
    const rawAllBadges: any = await sa.from("badges").select("*").order("sort_order");
    const rawAllAch: any = await sa.from("achievements").select("*").order("sort_order");

    const pData: any = rawProfile.data;
    const progData: any = rawProg?.data;
    const scanData: any[] = rawScans?.data ?? [];
    const badgeData: any[] = rawBadges?.data ?? [];
    const achData: any[] = rawAch?.data ?? [];
    const allBadgeData: any[] = rawAllBadges?.data ?? [];
    const allAchData: any[] = rawAllAch?.data ?? [];

    const earnedBadgeIds = new Set(badgeData.map((b: any) => b.badge_id));
    const earnedAchIds = new Set(achData.map((a: any) => a.achievement_id));

    return {
      username: pData.username,
      exp: progData?.total_exp ?? 0,
      level: progData?.current_level ?? 1,
      scanCount: scanData.length,
      badgeCount: earnedBadgeIds.size,
      achCount: earnedAchIds.size,
      badges: allBadgeData.map((b: any) => ({
        ...b,
        earned: earnedBadgeIds.has(b.id),
        earnedAt: badgeData.find((eb: any) => eb.badge_id === b.id)?.earned_at,
      })),
      achievements: allAchData.map((a: any) => ({
        ...a,
        earned: earnedAchIds.has(a.id),
        earnedAt: achData.find((ea: any) => ea.achievement_id === a.id)?.earned_at,
      })),
    };
  });

// ---------- Friend System ----------

const friendInput = z.object({ receiverId: z.string().min(1) });

/** Send a friend request */
export const sendFriendRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => friendInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    if (data.receiverId === userId) {
      return { ok: false as const, reason: "self_request" as const };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa: any = supabaseAdmin;
    // Check if already friends or pending
    const { data: existing } = await sa
      .from("friend_requests")
      .select("id, status")
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${data.receiverId}),and(sender_id.eq.${data.receiverId},receiver_id.eq.${userId})`)
      .maybeSingle();
    if (existing) {
      if (existing.status === "accepted") return { ok: false as const, reason: "already_friends" as const };
      if (existing.status === "pending") return { ok: false as const, reason: "already_pending" as const };
      const { error } = await sa
        .from("friend_requests")
        .update({ status: "pending", updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { ok: true as const };
    }
    const { error } = await sa
      .from("friend_requests")
      .insert({ sender_id: userId, receiver_id: data.receiverId, status: "pending" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Accept a friend request */
export const acceptFriendRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => friendInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa: any = supabaseAdmin;
    const { error } = await sa
      .from("friend_requests")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("sender_id", data.receiverId)
      .eq("receiver_id", userId)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Decline or cancel a friend request */
export const declineFriendRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => friendInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa: any = supabaseAdmin;
    const { error } = await sa
      .from("friend_requests")
      .delete()
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${data.receiverId}),and(sender_id.eq.${data.receiverId},receiver_id.eq.${userId})`)
      .eq("status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Remove a friend (delete accepted request) */
export const removeFriend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => friendInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa: any = supabaseAdmin;
    const { error } = await sa
      .from("friend_requests")
      .delete()
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${data.receiverId}),and(sender_id.eq.${data.receiverId},receiver_id.eq.${userId})`)
      .eq("status", "accepted");
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export interface FriendUser {
  userId: string;
  username: string;
  level: number;
  totalExp: number;
  scanCount: number;
  badgesCount: number;
  status: "accepted" | "pending" | "sent";
  createdAt: string;
}

/** Get all friend relationships for the current user */
export const getFriends = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<FriendUser[]> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sa: any = supabaseAdmin;
    const { data: requests } = await sa
      .from("friend_requests")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });
    if (!requests) return [];

    const friendIds = new Set<string>();
    const results: FriendUser[] = [];
    for (const r of requests) {
      const otherId = r.sender_id === userId ? r.receiver_id : r.sender_id;
      if (friendIds.has(otherId)) continue;
      friendIds.add(otherId);

      let status: FriendUser["status"];
      if (r.status === "accepted") {
        status = "accepted";
      } else if (r.status === "pending" && r.sender_id === userId) {
        status = "sent";
      } else if (r.status === "pending" && r.receiver_id === userId) {
        status = "pending";
      } else {
        continue;
      }

      results.push({
        userId: otherId,
        username: "...",
        level: 0,
        totalExp: 0,
        scanCount: 0,
        badgesCount: 0,
        status,
        createdAt: r.created_at,
      });
    }

    const uids = results.map((r) => r.userId);
    if (uids.length > 0) {
      const [{ data: profiles }, { data: progress }, { data: scans }, { data: badges }] = await Promise.all([
        sa.from("profiles").select("id, username").in("id", uids),
        sa.from("user_progress").select("user_id, total_exp, current_level").in("user_id", uids),
        sa.from("user_artifact_progress").select("user_id").in("user_id", uids),
        sa.from("user_badges").select("user_id").in("user_id", uids),
      ]);
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      const progressMap = new Map((progress ?? []).map((p: any) => [p.user_id, p]));
      const scanCountMap = new Map<string, number>();
      for (const s of scans ?? []) scanCountMap.set(s.user_id, (scanCountMap.get(s.user_id) ?? 0) + 1);
      const badgeCountMap = new Map<string, number>();
      for (const b of badges ?? []) badgeCountMap.set(b.user_id, (badgeCountMap.get(b.user_id) ?? 0) + 1);

      for (const r of results) {
        const p = profileMap.get(r.userId);
        r.username = p?.username ?? "???";
        const pr = progressMap.get(r.userId);
        r.level = pr?.current_level ?? 0;
        r.totalExp = pr?.total_exp ?? 0;
        r.scanCount = scanCountMap.get(r.userId) ?? 0;
        r.badgesCount = badgeCountMap.get(r.userId) ?? 0;
      }
    }

    return results;
  });

const searchInput = z.object({ q: z.string().min(1).max(50) });

/** Search users by username prefix */
export const searchUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => searchInput.parse(d))
  .handler(async ({ data, context }): Promise<Array<{ id: string; username: string }>> => {
    const { supabase, userId } = context;
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .ilike("username", `%${data.q}%`)
      .limit(10);
    return (profiles ?? [])
      .filter((p: any) => p.id !== userId)
      .map((p: any) => ({ id: p.id, username: p.username }));
  });

import type { Tables } from "@/integrations/supabase/types";

export type ArtifactQuizArtifact = Pick<
  Tables<"artifacts">,
  | "id"
  | "category"
  | "name_bm"
  | "name_en"
  | "origin_bm"
  | "origin_en"
  | "material_bm"
  | "material_en"
  | "era_bm"
  | "era_en"
  | "description_bm"
  | "description_en"
>;

export type Localized = {
  bm: string;
  en: string;
};

export interface ArtifactQuizQuestion {
  id: string;
  prompt: Localized;
  options: Localized[];
  correctIndex: number;
  /** Difficulty tier for display: 1 = easiest, 5 = hardest */
  difficulty: 1 | 2 | 3 | 4 | 5;
}

/* ── Hardcoded category labels (used as distractors for category questions) ── */

const CATEGORY_LABELS: Array<{ key: string; label: Localized }> = [
  { key: "weapons", label: { bm: "Senjata Tradisional", en: "Traditional Weapons" } },
  { key: "regalia", label: { bm: "Pakaian & Perhiasan Diraja", en: "Royal Regalia" } },
  { key: "music", label: { bm: "Alat Muzik Tradisional", en: "Traditional Music" } },
  { key: "crafts", label: { bm: "Kraftangan Warisan", en: "Heritage Crafts" } },
  { key: "toys", label: { bm: "Mainan Tradisional", en: "Traditional Toys" } },
];

/* ── Generic wrong-answer pools for description/fact questions ── */

const GENERIC_FALSE_FACTS: Localized[] = [
  { bm: "Digunakan dalam upacara istiadat kerajaan", en: "Used in royal coronation ceremonies" },
  { bm: "Diperbuat daripada emas tulen 24 karat", en: "Made of 24-karat pure gold" },
  { bm: "Berasal daripada tamadun Mesir Purba", en: "Originates from Ancient Egypt" },
  { bm: "Alat muzik yang dimainkan semasa perang", en: "A musical instrument played during war" },
  { bm: "Senjata yang digunakan untuk memburu", en: "A weapon used for hunting" },
  { bm: "Ditemui di dasar laut Selat Melaka", en: "Discovered at the bottom of the Malacca Strait" },
  { bm: "Pakaian rasmi sultan dan pembesar", en: "Formal attire of sultans and nobles" },
  { bm: "Permainan kanak-kanak dari Eropah", en: "A children's game from Europe" },
  { bm: "Alat muzik tiupan daripada gading", en: "A wind instrument made of ivory" },
  { bm: "Digunakan sebagai alat navigasi pelayaran", en: "Used as a navigation tool for sailing" },
  { bm: "Diperbuat daripada batu granit", en: "Made of granite stone" },
  { bm: "Berasal dari Jepun zaman feudal", en: "Originates from feudal Japan" },
  { bm: "Hiasan dinding istana tradisional", en: "Traditional palace wall decoration" },
  { bm: "Alat pertanian masyarakat dahulu", en: "Farming tool of ancient communities" },
  { bm: "Simbol perdamaian antara kerajaan", en: "Symbol of peace between kingdoms" },
];

/* ── Generic era distractors (for composite questions) ── */

const GENERIC_ERAS: Localized[] = [
  { bm: "Abad ke-12", en: "12th century" },
  { bm: "Abad ke-14", en: "14th century" },
  { bm: "Abad ke-16", en: "16th century" },
  { bm: "Abad ke-19", en: "19th century" },
  { bm: "Abad ke-20", en: "20th century" },
  { bm: "Zaman Prasejarah", en: "Prehistoric era" },
  { bm: "Zaman Penjajahan British", en: "British colonial era" },
];

/* ── Generic origin distractors (for composite questions) ── */

const GENERIC_ORIGINS: Localized[] = [
  { bm: "Kesultanan Melayu Melaka", en: "Malacca Sultanate" },
  { bm: "Sarawak", en: "Sarawak" },
  { bm: "Sabah", en: "Sabah" },
  { bm: "Pahang", en: "Pahang" },
  { bm: "Kedah", en: "Kedah" },
  { bm: "Johor", en: "Johor" },
  { bm: "Perak", en: "Perak" },
  { bm: "Negeri Sembilan", en: "Negeri Sembilan" },
  { bm: "Terengganu", en: "Terengganu" },
  { bm: "Kelantan", en: "Kelantan" },
];

/* ── Generic material distractors (for composite questions) ── */

const GENERIC_MATERIALS: Localized[] = [
  { bm: "Emas dan perak", en: "Gold and silver" },
  { bm: "Batu dan tanah liat", en: "Stone and clay" },
  { bm: "Kulit haiwan", en: "Animal hide" },
  { bm: "Gading dan tulang", en: "Ivory and bone" },
  { bm: "Kaca dan seramik", en: "Glass and ceramic" },
  { bm: "Tekstil kapas", en: "Cotton textile" },
  { bm: "Perunggu dan loyang", en: "Bronze and brass" },
];

/* ── Generic statement templates for description-based questions ── */

function makeTrueStatement(a: ArtifactQuizArtifact): Localized {
  return {
    bm: `${a.name_bm} berasal dari ${a.origin_bm} dan diperbuat daripada ${a.material_bm}`,
    en: `${a.name_en} originates from ${a.origin_en} and is made of ${a.material_en}`,
  };
}

function makeEraStatement(a: ArtifactQuizArtifact): Localized {
  return {
    bm: `${a.name_bm} wujud sejak ${a.era_bm}`,
    en: `${a.name_en} dates from the ${a.era_en}`,
  };
}

function makeOriginStatement(a: ArtifactQuizArtifact): Localized {
  return {
    bm: `Berasal dari ${a.origin_bm}`,
    en: `Originates from ${a.origin_en}`,
  };
}

function makeMaterialStatement(a: ArtifactQuizArtifact): Localized {
  return {
    bm: `Diperbuat daripada ${a.material_bm}`,
    en: `Made of ${a.material_en}`,
  };
}

function pickDescriptionShort(a: ArtifactQuizArtifact): Localized {
  // Use the first ~80 chars of the description
  const trunc = (s: string) => s.length > 80 ? s.slice(0, 80).replace(/\s+\S*$/, "") + "…" : s;
  return { bm: trunc(a.description_bm), en: trunc(a.description_en) };
}

/* ── Helpers ── */

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function shuffleArray<T>(arr: T[], seed: string): T[] {
  const copy = [...arr];
  const r = hashSeed(seed);
  for (let i = copy.length - 1; i > 0; i--) {
    const j = (r + i) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickDistinct<T>(pool: T[], correct: T, seed: string, count: number, extractKey?: (item: T) => string): T[] {
  const others = pool.filter((item) => {
    if (extractKey) return extractKey(item) !== extractKey(correct);
    return item !== correct;
  });
  const picked: T[] = [];
  for (let i = 0; i < others.length && picked.length < count; i++) {
    const idx = (hashSeed(`${seed}-${i}`) + i) % others.length;
    const candidate = others[idx];
    const key = extractKey ? extractKey(candidate) : String(candidate);
    if (!picked.some((p) => (extractKey ? extractKey(p) : String(p)) === key)) {
      picked.push(candidate);
    }
  }
  return picked;
}

function buildShuffledOptions(correct: Localized, distractors: Localized[], seed: string): { options: Localized[]; correctIndex: number } {
  const combined = [correct, ...distractors];
  const rotated = shuffleArray(combined, seed);
  return {
    options: rotated,
    correctIndex: rotated.findIndex((o) => o.en === correct.en),
  };
}

/* ── Individual question builders ── */

/** Q1 — Easy: category */
function buildCategoryQuestion(artifact: ArtifactQuizArtifact): ArtifactQuizQuestion {
  // Determine the correct label for the artifact's category
  const known = CATEGORY_LABELS.find((c) => c.key === artifact.category);
  const correctLabel: Localized = known
    ? known.label
    : { bm: artifact.category, en: artifact.category };

  // Build distractors from other known categories
  const otherLabels = CATEGORY_LABELS
    .filter((c) => c.key !== artifact.category)
    .map((c) => c.label);

  // Pick 3 distinct distractors
  const distractors = pickDistinct(
    otherLabels.length >= 3 ? otherLabels : [...otherLabels, ...GENERIC_FALSE_FACTS],
    correctLabel,
    `${artifact.id}-cat`,
    3,
    (o: Localized) => o.en,
  );

  const { options, correctIndex } = buildShuffledOptions(correctLabel, distractors, `${artifact.id}-cat-shuffle`);

  return {
    id: `${artifact.id}-category`,
    difficulty: 1,
    prompt: {
      bm: `${artifact.name_bm} tergolong dalam kategori yang mana?`,
      en: `Which category does ${artifact.name_en} belong to?`,
    },
    options,
    correctIndex,
  };
}

/** Q2 — Easy: era */
function buildEraQuestion(artifact: ArtifactQuizArtifact): ArtifactQuizQuestion {
  const correct = { bm: artifact.era_bm, en: artifact.era_en };
  const distractors = pickDistinct(
    GENERIC_ERAS,
    correct,
    `${artifact.id}-era`,
    3,
    (o: Localized) => o.en,
  );
  const { options, correctIndex } = buildShuffledOptions(correct, distractors, `${artifact.id}-era-shuffle`);

  return {
    id: `${artifact.id}-era`,
    difficulty: 2,
    prompt: {
      bm: `Dari zaman manakah ${artifact.name_bm}?`,
      en: `What era does ${artifact.name_en} date from?`,
    },
    options,
    correctIndex,
  };
}

/** Q3 — Medium: origin */
function buildOriginQuestion(artifact: ArtifactQuizArtifact): ArtifactQuizQuestion {
  const correct = { bm: artifact.origin_bm, en: artifact.origin_en };
  const distractors = pickDistinct(
    GENERIC_ORIGINS,
    correct,
    `${artifact.id}-origin`,
    3,
    (o: Localized) => o.en,
  );
  const { options, correctIndex } = buildShuffledOptions(correct, distractors, `${artifact.id}-origin-shuffle`);

  return {
    id: `${artifact.id}-origin`,
    difficulty: 3,
    prompt: {
      bm: `Apakah asal ${artifact.name_bm}?`,
      en: `What is the origin of ${artifact.name_en}?`,
    },
    options,
    correctIndex,
  };
}

/** Q4 — Medium: material */
function buildMaterialQuestion(artifact: ArtifactQuizArtifact): ArtifactQuizQuestion {
  const correct = { bm: artifact.material_bm, en: artifact.material_en };
  const distractors = pickDistinct(
    GENERIC_MATERIALS,
    correct,
    `${artifact.id}-material`,
    3,
    (o: Localized) => o.en,
  );
  const { options, correctIndex } = buildShuffledOptions(correct, distractors, `${artifact.id}-material-shuffle`);

  return {
    id: `${artifact.id}-material`,
    difficulty: 3,
    prompt: {
      bm: `Apakah bahan ${artifact.name_bm}?`,
      en: `What material is ${artifact.name_en} made from?`,
    },
    options,
    correctIndex,
  };
}

/** Q5 — Medium: description truth (derived from description) */
function buildDescriptionTruthQuestion(artifact: ArtifactQuizArtifact): ArtifactQuizQuestion {
  const correct = pickDescriptionShort(artifact);
  // Use other artifacts' descriptions as distractors — fall back to generic facts
  const allDescriptions: Localized[] = [correct, ...GENERIC_FALSE_FACTS];
  const distractors = pickDistinct(
    allDescriptions,
    correct,
    `${artifact.id}-desc`,
    3,
    (o: Localized) => o.en,
  );

  // If we couldn't get enough distractors from descriptions, pad with generic facts
  while (distractors.length < 3) {
    const fallback = GENERIC_FALSE_FACTS[distractors.length % GENERIC_FALSE_FACTS.length];
    if (!distractors.some((d) => d.en === fallback.en)) {
      distractors.push(fallback);
    }
  }

  const { options, correctIndex } = buildShuffledOptions(correct, distractors.slice(0, 3), `${artifact.id}-desc-shuffle`);

  return {
    id: `${artifact.id}-desc-truth`,
    difficulty: 3,
    prompt: {
      bm: `Penerangan yang manakah BETUL untuk ${artifact.name_bm}?`,
      en: `Which description is CORRECT for ${artifact.name_en}?`,
    },
    options,
    correctIndex,
  };
}

/** Q6 — Medium-hard: composite era + origin */
function buildCompositeEraOriginQuestion(artifact: ArtifactQuizArtifact): ArtifactQuizQuestion {
  const correct: Localized = {
    bm: `${artifact.era_bm} — ${artifact.origin_bm}`,
    en: `${artifact.era_en} — ${artifact.origin_en}`,
  };

  // Generate 3 wrong combos
  const wrong: Localized[] = [];
  const used = new Set<string>();
  for (let i = 0; i < 20 && wrong.length < 3; i++) {
    const wrongEra = GENERIC_ERAS[hashSeed(`${artifact.id}-ceo-era-${i}`) % GENERIC_ERAS.length];
    const wrongOrigin = GENERIC_ORIGINS[hashSeed(`${artifact.id}-ceo-origin-${i}`) % GENERIC_ORIGINS.length];
    const key = `${wrongEra.en}|${wrongOrigin.en}`;
    if (
      !used.has(key) &&
      wrongEra.en !== artifact.era_en &&
      wrongOrigin.en !== artifact.origin_en
    ) {
      used.add(key);
      wrong.push({
        bm: `${wrongEra.bm} — ${wrongOrigin.bm}`,
        en: `${wrongEra.en} — ${wrongOrigin.en}`,
      });
    }
  }

  const { options, correctIndex } = buildShuffledOptions(correct, wrong, `${artifact.id}-ceo-shuffle`);

  return {
    id: `${artifact.id}-composite-era-origin`,
    difficulty: 4,
    prompt: {
      bm: `Gabungan zaman dan asal yang manakah BETUL untuk ${artifact.name_bm}?`,
      en: `Which era + origin combination is CORRECT for ${artifact.name_en}?`,
    },
    options,
    correctIndex,
  };
}

/** Q7 — Hard: false detection — 3 true + 1 false statement */
function buildFalseDetectionQuestion(artifact: ArtifactQuizArtifact): ArtifactQuizQuestion {
  // 3 true statements
  const trueStmts: Localized[] = [
    makeEraStatement(artifact),
    makeOriginStatement(artifact),
    makeMaterialStatement(artifact),
  ];

  // 1 false statement — combine wrong era + wrong origin
  const wrongEra = GENERIC_ERAS[hashSeed(`${artifact.id}-fd-era`) % GENERIC_ERAS.length];
  const wrongOrigin = GENERIC_ORIGINS[hashSeed(`${artifact.id}-fd-origin`) % GENERIC_ORIGINS.length];
  const falseStmt: Localized = {
    bm: `${artifact.name_bm} berasal dari ${wrongOrigin.bm} dan wujud sejak ${wrongEra.bm}`,
    en: `${artifact.name_en} originates from ${wrongOrigin.en} and dates from the ${wrongEra.en}`,
  };

  const combined = [...trueStmts, falseStmt];
  const shuffled = shuffleArray(combined, `${artifact.id}-fd-shuffle`);
  const correctIndex = shuffled.findIndex((s) => s.en === falseStmt.en);

  return {
    id: `${artifact.id}-false-detect`,
    difficulty: 4,
    prompt: {
      bm: `Pernyataan yang manakah PALSU tentang ${artifact.name_bm}?`,
      en: `Which statement is FALSE about ${artifact.name_en}?`,
    },
    options: shuffled,
    correctIndex,
  };
}

/** Q8 — Hard: description match — 4 descriptions, one matches the artifact name */
function buildDescriptionMatchQuestion(artifact: ArtifactQuizArtifact): ArtifactQuizQuestion {
  // Correct: description of the artifact
  const correctDesc = pickDescriptionShort(artifact);
  // The question prompt says the name, and user picks the description

  // Build 3 wrong descriptions from generic false facts
  // Pick 3 wrong descriptions about OTHER things, or just wrong facts
  // Actually: we put the descriptions as options, and ask "which matches X"
  // The correct one is the artifact's description

  // We need 3 other descriptions
  const wrongDescs = pickDistinct(
    GENERIC_FALSE_FACTS,
    correctDesc,
    `${artifact.id}-dm`,
    3,
    (o: Localized) => o.en,
  );

  const combined = [correctDesc, ...wrongDescs];
  const shuffled = shuffleArray(combined, `${artifact.id}-dm-shuffle`);
  const correctIndex = shuffled.findIndex((s) => s.en === correctDesc.en);

  return {
    id: `${artifact.id}-desc-match`,
    difficulty: 5,
    prompt: {
      bm: `Penerangan yang manakah PADAN dengan ${artifact.name_bm}?`,
      en: `Which description MATCHES ${artifact.name_en}?`,
    },
    options: shuffled,
    correctIndex,
  };
}

/** Q9 — Hard: composite era + material */
function buildCompositeEraMaterialQuestion(artifact: ArtifactQuizArtifact): ArtifactQuizQuestion {
  const correct: Localized = {
    bm: `${artifact.era_bm} — ${artifact.material_bm}`,
    en: `${artifact.era_en} — ${artifact.material_en}`,
  };

  const wrong: Localized[] = [];
  const used = new Set<string>();
  for (let i = 0; i < 20 && wrong.length < 3; i++) {
    const wrongEra = GENERIC_ERAS[hashSeed(`${artifact.id}-cem-era-${i}`) % GENERIC_ERAS.length];
    const wrongMat = GENERIC_MATERIALS[hashSeed(`${artifact.id}-cem-mat-${i}`) % GENERIC_MATERIALS.length];
    const key = `${wrongEra.en}|${wrongMat.en}`;
    if (
      !used.has(key) &&
      wrongEra.en !== artifact.era_en &&
      wrongMat.en !== artifact.material_en
    ) {
      used.add(key);
      wrong.push({
        bm: `${wrongEra.bm} — ${wrongMat.bm}`,
        en: `${wrongEra.en} — ${wrongMat.en}`,
      });
    }
  }

  const { options, correctIndex } = buildShuffledOptions(correct, wrong, `${artifact.id}-cem-shuffle`);

  return {
    id: `${artifact.id}-composite-era-material`,
    difficulty: 5,
    prompt: {
      bm: `Gabungan zaman dan bahan yang manakah BETUL untuk ${artifact.name_bm}?`,
      en: `Which era + material combination is CORRECT for ${artifact.name_en}?`,
    },
    options,
    correctIndex,
  };
}

/* ── Main export ── */

export function buildArtifactQuiz(artifact: ArtifactQuizArtifact, hardMode = false): ArtifactQuizQuestion[] {
  // Normal mode: 9 questions from admin data
  const questions: ArtifactQuizQuestion[] = [
    buildCategoryQuestion(artifact),              // Q1 — easy 1
    buildEraQuestion(artifact),                   // Q2 — easy 2
    buildOriginQuestion(artifact),                // Q3 — medium 3
    buildMaterialQuestion(artifact),              // Q4 — medium 3
    buildDescriptionTruthQuestion(artifact),      // Q5 — medium 3
    buildCompositeEraOriginQuestion(artifact),    // Q6 — medium-hard 4
    buildFalseDetectionQuestion(artifact),        // Q7 — hard 4
    buildDescriptionMatchQuestion(artifact),      // Q8 — hard 5
    buildCompositeEraMaterialQuestion(artifact),  // Q9 — hard 5
  ];

  // Hard mode: increase difficulty stars on all questions
  if (hardMode) {
    return questions.map((q) => ({
      ...q,
      difficulty: Math.min(5, q.difficulty + 1) as 1 | 2 | 3 | 4 | 5,
      prompt: {
        bm: q.prompt.bm.replace("?", "? (Mod Sukar)"),
        en: q.prompt.en.replace("?", "? (Hard Mode)"),
      },
    }));
  }

  return questions;
}

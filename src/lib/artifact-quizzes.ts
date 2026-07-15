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

/* ── Question-type pools ── */

const CATEGORY_OPTIONS: Array<{ key: string; label: Localized }> = [
  { key: "weapons", label: { bm: "Senjata Tradisional", en: "Traditional Weapons" } },
  { key: "regalia", label: { bm: "Pakaian & Perhiasan Diraja", en: "Royal Regalia" } },
  { key: "music", label: { bm: "Alat Muzik Tradisional", en: "Traditional Music" } },
  { key: "crafts", label: { bm: "Kraftangan Warisan", en: "Heritage Crafts" } },
  { key: "toys", label: { bm: "Mainan Tradisional", en: "Traditional Toys" } },
];

const ORIGIN_OPTIONS: Localized[] = [
  { bm: "Kesultanan Melayu", en: "Malay Sultanates" },
  { bm: "Melaka", en: "Malacca" },
  { bm: "Sarawak", en: "Sarawak" },
  { bm: "Semenanjung Tanah Melayu", en: "Malay Peninsula" },
  { bm: "Istana Melayu", en: "Malay palaces" },
  { bm: "Kelantan dan Terengganu", en: "Kelantan and Terengganu" },
  { bm: "Pahang dan Terengganu", en: "Pahang and Terengganu" },
  { bm: "Kelantan", en: "Kelantan" },
  { bm: "Terengganu dan Kelantan", en: "Terengganu and Kelantan" },
  { bm: "China; komuniti Cina Malaysia", en: "China; Malaysian Chinese community" },
];

const MATERIAL_OPTIONS: Localized[] = [
  { bm: "Besi tempaan dan kayu", en: "Forged iron and wood" },
  { bm: "Tembaga", en: "Bronze" },
  { bm: "Kayu keras dan cat asli", en: "Hardwood and natural pigments" },
  { bm: "Kain songket", en: "Songket cloth" },
  { bm: "Sutera, songket, benang emas", en: "Silk, songket, gold thread" },
  { bm: "Perak tulen", en: "Pure silver" },
  { bm: "Perunggu", en: "Bronze" },
  { bm: "Kayu keras dan kulit lembu", en: "Hardwood and cow hide" },
  { bm: "Buluh", en: "Bamboo" },
  { bm: "Kayu, benang sutera dan benang emas", en: "Wood, silk thread and gold thread" },
  { bm: "Buluh dan kertas berwarna", en: "Bamboo and coloured paper" },
  { bm: "Tembaga dan kayu", en: "Copper and wood" },
  { bm: "Kayu keras, guli atau biji getah", en: "Hardwood, marbles or rubber seeds" },
  { bm: "Buluh, kayu dan tali", en: "Bamboo, wood and string" },
  { bm: "Kayu dan dakwat", en: "Wood and ink" },
];

/* ── Era pool (all unique eras across artifacts) ── */
const ERA_OPTIONS: Localized[] = [
  { bm: "Abad ke-15", en: "15th century" },
  { bm: "Abad ke-15 hingga ke-16", en: "15th to 16th century" },
  { bm: "Abad ke-18 hingga ke-19", en: "18th to 19th century" },
  { bm: "Abad ke-15 hingga kini", en: "15th century to present" },
  { bm: "Abad ke-17 hingga kini", en: "17th century to present" },
  { bm: "Abad ke-18", en: "18th century" },
  { bm: "Turun-temurun", en: "Passed down through generations" },
  { bm: "Abad ke-16 hingga kini", en: "16th century to present" },
  { bm: "Abad ke-19 hingga kini", en: "19th century to present" },
  { bm: "Lebih 1,500 tahun", en: "Over 1,500 years old" },
  { bm: "Lebih 1,000 tahun", en: "Over 1,000 years old" },
];

/* ── Key facts pool (one per artifact) ── */
const KEY_FACTS: Record<string, Localized> = {
  "keris-panjang": {
    bm: "Senjata upacara diraja dengan bilah bergelombang",
    en: "A royal ceremonial weapon with a wavy blade",
  },
  "meriam-melaka": {
    bm: "Digunakan untuk mempertahankan Kota Melaka",
    en: "Used to defend the fortress of Malacca",
  },
  terabai: {
    bm: "Perisai tradisional kaum Iban dan Bidayuh",
    en: "Traditional shield of the Iban and Bidayuh peoples",
  },
  tengkolok: {
    bm: "Ikat kepala rasmi yang dilipat mengikut gaya negeri",
    en: "Royal headdress folded in state-distinctive styles",
  },
  "baju-kurung-diraja": {
    bm: "Pakaian diraja daripada sutera dan songket bersulam emas",
    en: "Royal attire of silk and songket with gold embroidery",
  },
  "set-perak-diraja": {
    bm: "Set perkakas perak termasuk tepak sirih dan cerana",
    en: "Silverware set including betel-nut caskets and trays",
  },
  "gong-gamelan": {
    bm: "Gong perunggu yang menjadi tulang belakang ensembel gamelan",
    en: "Bronze gong that anchors the gamelan ensemble",
  },
  "rebana-ubi": {
    bm: "Gendang besar berbentuk ubi dipalu semasa perayaan",
    en: "Large tuber-shaped drum struck during festivals",
  },
  "seruling-tradisional": {
    bm: "Seruling buluh dimainkan dalam Mak Yong dan Wayang Kulit",
    en: "Bamboo flute played in Mak Yong and Wayang Kulit",
  },
  "alat-tenun-songket": {
    bm: "Alat tenun kayu untuk menghasilkan kain songket",
    en: "A wooden loom used to weave songket cloth",
  },
  "wau-bulan": {
    bm: "Layang-layang tradisional berbentuk bulan sabit",
    en: "A traditional crescent-moon shaped kite",
  },
  "canting-batik": {
    bm: "Alat bermata tembaga untuk melukis lilin pada batik",
    en: "A copper-spouted tool for applying wax onto batik",
  },
  congkak: {
    bm: "Permainan papan tradisional yang melatih kiraan pantas",
    en: "Traditional board game that sharpens counting skills",
  },
  "diabolo-cina": {
    bm: "Alat permainan berbentuk jam pasir yang berdengung bila berputar",
    en: "Hourglass-shaped toy that hums when spun fast",
  },
  "catur-cina": {
    bm: "Permainan strategi di papan bergrid dengan 'sungai' di tengah",
    en: "Strategy game on a gridded board with a central 'river'",
  },
};

/* ── Hard mode: purpose/use pool (derived from descriptions) ── */
const HARD_PURPOSE: Record<string, Localized> = {
  "keris-panjang": { bm: "Upacara istiadat dan simbol kedaulatan", en: "Royal ceremony and sovereignty symbol" },
  "meriam-melaka": { bm: "Pertahanan benteng dan isyarat meriam", en: "Fortress defence and cannon signalling" },
  terabai: { bm: "Perlindungan dalam peperangan tradisional", en: "Protection in traditional warfare" },
  tengkolok: { bm: "Lambang kebesaran di istiadat rasmi", en: "Symbol of grandeur at official ceremonies" },
  "baju-kurung-diraja": { bm: "Busana rasmi istiadat istana", en: "Formal attire for palace ceremonies" },
  "set-perak-diraja": { bm: "Alat kebesaran istiadat menyirih", en: "Ceremonial betel-nut service set" },
  "gong-gamelan": { bm: "Pengiring tarian dan muzik istana", en: "Accompaniment for dance and palace music" },
  "rebana-ubi": { bm: "Alat komunikasi perayaan dan isyarat", en: "Festival communication and signalling drum" },
  "seruling-tradisional": { bm: "Pengiring teater tradisional Mak Yong", en: "Accompaniment for Mak Yong theatre" },
  "alat-tenun-songket": { bm: "Penenunan kain songket berkualiti tinggi", en: "Weaving high-quality songket cloth" },
  "wau-bulan": { bm: "Pertandingan dan hiasan musim menuai", en: "Competition and harvest season decoration" },
  "canting-batik": { bm: "Alatan melukis corak batik tradisional", en: "Tool for drawing traditional batik patterns" },
  congkak: { bm: "Permainan strategi dan pengiraan pantas", en: "Strategy game and quick counting" },
  "diabolo-cina": { bm: "Persembahan akrobatik dan koordinasi", en: "Acrobatic performance and coordination" },
  "catur-cina": { bm: "Permainan strategi pemikiran taktikal", en: "Strategy game for tactical thinking" },
};

/* ── Hard mode: false statement pool (wrong facts to mix in) ── */
// Each entry is a statement that is FALSE for THIS artifact but plausible
const HARD_FALSE: Record<string, { bm: string[]; en: string[] }> = {
  "keris-panjang": { bm: ["Diperbuat daripada kain songket", "Berasal dari Sarawak"], en: ["Made of songket cloth", "Originates from Sarawak"] },
  "meriam-melaka": { bm: ["Digunakan dalam tarian istana", "Bersalut perak"], en: ["Used in palace dances", "Silver-plated"] },
  terabai: { bm: ["Alat muzik tradisional", "Berasal dari Kesultanan Melayu"], en: ["A traditional musical instrument", "Originates from Malay Sultanates"] },
  tengkolok: { bm: ["Diperbuat daripada besi tempa", "Alat permainan"], en: ["Made of forged iron", "A game piece"] },
  "baju-kurung-diraja": { bm: ["Daripada buluh dan kertas", "Berasal dari China"], en: ["Made of bamboo and paper", "Originates from China"] },
  "set-perak-diraja": { bm: ["Alat muzik tiupan", "Senjata peperangan"], en: ["A wind instrument", "A war weapon"] },
  "gong-gamelan": { bm: ["Diperbuat daripada kayu", "Berasal dari Kelantan"], en: ["Made of wood", "Originates from Kelantan"] },
  "rebana-ubi": { bm: ["Disulam dengan benang emas", "Berasal dari Melaka"], en: ["Embroidered with gold thread", "Originates from Malacca"] },
  "seruling-tradisional": { bm: ["Gendang besar untuk perang", "Daripada besi tempaan"], en: ["Large war drum", "Made of forged iron"] },
  "alat-tenun-songket": { bm: ["Alat mengukur masa", "Senjata tradisional"], en: ["A time-measuring device", "A traditional weapon"] },
  "wau-bulan": { bm: ["Terbuat daripada perak tulen", "Alat muzik perkusi"], en: ["Made of pure silver", "A percussion instrument"] },
  "canting-batik": { bm: ["Seruling daripada buluh", "Pakaian istiadat"], en: ["A bamboo flute", "Ceremonial attire"] },
  congkak: { bm: ["Catur tradisional Melayu", "Diperbuat daripada besi"], en: ["A Malay chess variant", "Made of iron"] },
  "diabolo-cina": { bm: ["Labu tiupan tradisional", "Berasal dari Sarawak"], en: ["A traditional gourd flute", "Originates from Sarawak"] },
  "catur-cina": { bm: ["Alat tenun songket", "Permainan fizikal lasak"], en: ["A songket weaving tool", "A physical sport game"] },
};

/* ── Hard mode: similar artifacts (sharing same origin) ── */
// Maps artifacts to others that share their origin region
const SAME_ORIGIN_GROUPS: Record<string, string[]> = {
  "keris-panjang": ["meriam-melaka", "terabai"],
  "meriam-melaka": ["keris-panjang", "seruling-tradisional"],
  terabai: ["keris-panjang", "meriam-melaka"],
  tengkolok: ["baju-kurung-diraja", "set-perak-diraja"],
  "baju-kurung-diraja": ["tengkolok", "set-perak-diraja"],
  "set-perak-diraja": ["tengkolok", "baju-kurung-diraja"],
  "gong-gamelan": ["rebana-ubi", "seruling-tradisional"],
  "rebana-ubi": ["gong-gamelan", "seruling-tradisional"],
  "seruling-tradisional": ["gong-gamelan", "rebana-ubi"],
  "alat-tenun-songket": ["wau-bulan", "canting-batik"],
  "wau-bulan": ["alat-tenun-songket", "canting-batik", "diabolo-cina"],
  "canting-batik": ["alat-tenun-songket", "wau-bulan"],
  congkak: ["diabolo-cina", "catur-cina"],
  "diabolo-cina": ["congkak", "catur-cina", "wau-bulan"],
  "catur-cina": ["congkak", "diabolo-cina"],
};

/* ── Helpers ── */

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function buildLocalizedOptions(correct: Localized, pool: Localized[], seed: string): Localized[] {
  const distractors = pool.filter((option) => option.en !== correct.en);
  const unique: Localized[] = [];
  for (let i = 0; i < distractors.length; i += 1) {
    const candidate = distractors[(hashSeed(`${seed}-${i}`) + i) % distractors.length];
    if (!unique.some((option) => option.en === candidate.en)) unique.push(candidate);
    if (unique.length === 3) break;
  }

  const combined = [correct, ...unique];
  const rotate = hashSeed(`${seed}-rotate`) % combined.length;
  return combined.map((_, index) => combined[(index + rotate) % combined.length]);
}

/** Pick a random wrong value from a pool, different from the correct value */
function pickWrong(pool: Localized[], correctEn: string, seed: string): Localized {
  const others = pool.filter((opt) => opt.en !== correctEn);
  return others[hashSeed(seed) % others.length];
}

/* ── Per-type builders ── */

function buildCategoryOptions(category: string, seed: string): Localized[] {
  const correct = CATEGORY_OPTIONS.find((option) => option.key === category)?.label ?? CATEGORY_OPTIONS[0].label;
  return buildLocalizedOptions(correct, CATEGORY_OPTIONS.map((o) => o.label), seed);
}

function buildEraOptions(correct: Localized, seed: string): Localized[] {
  return buildLocalizedOptions(correct, ERA_OPTIONS, seed);
}

function buildFactOptions(correct: Localized, artifactId: string, seed: string): Localized[] {
  const distractors = Object.entries(KEY_FACTS)
    .filter(([id]) => id !== artifactId)
    .map(([, fact]) => fact);

  const unique: Localized[] = [];
  for (let i = 0; i < distractors.length; i += 1) {
    const candidate = distractors[(hashSeed(`${seed}-${i}`) + i) % distractors.length];
    if (!unique.some((opt) => opt.en === candidate.en)) unique.push(candidate);
    if (unique.length === 3) break;
  }

  const combined = [correct, ...unique];
  const rotate = hashSeed(`${seed}-rotate`) % combined.length;
  return combined.map((_, index) => combined[(index + rotate) % combined.length]);
}

/* ── Hard mode question builders ── */

/** Q6 — False Detection: 3 true + 1 false statement. Which is FALSE? */
function buildFalseDetection(artifact: ArtifactQuizArtifact, seed: string): ArtifactQuizQuestion {
  const falsePool = HARD_FALSE[artifact.id];
  // Pick one false statement
  const falseIdx = hashSeed(`${seed}-false`) % (falsePool?.bm.length ?? 1);
  const falseStmt: Localized = {
    bm: falsePool?.bm[falseIdx] ?? "Tidak diketahui",
    en: falsePool?.en[falseIdx] ?? "Unknown",
  };

  // Create 3 true statements from the artifact's actual data
  const trueStatements: Localized[] = [
    { bm: `Berasal dari ${artifact.origin_bm}`, en: `Originates from ${artifact.origin_en}` },
    { bm: `Dari zaman ${artifact.era_bm}`, en: `From the ${artifact.era_en}` },
    { bm: `Diperbuat daripada ${artifact.material_bm}`, en: `Made of ${artifact.material_en}` },
  ];

  // Shuffle false among true statements
  const allOptions = [...trueStatements, falseStmt];
  const rotate = hashSeed(`${seed}-falserotate`) % allOptions.length;
  const shuffled = allOptions.map((_, i) => allOptions[(i + rotate) % allOptions.length]);
  const correctIndex = shuffled.indexOf(falseStmt);

  return {
    id: `${artifact.id}-false-detect`,
    difficulty: 5,
    prompt: {
      bm: `Pernyataan yang manakah PALSU tentang ${artifact.name_bm}?`,
      en: `Which statement is FALSE about ${artifact.name_en}?`,
    },
    options: shuffled,
    correctIndex,
  };
}

/** Q7 — Hard purpose: What is X used for? */
function buildPurposeQuestion(artifact: ArtifactQuizArtifact, seed: string): ArtifactQuizQuestion {
  const correct = HARD_PURPOSE[artifact.id] ?? { bm: "Tidak diketahui", en: "Unknown" };
  const distractors = Object.entries(HARD_PURPOSE)
    .filter(([id]) => id !== artifact.id)
    .map(([, p]) => p);

  const unique: Localized[] = [];
  for (let i = 0; i < distractors.length; i += 1) {
    const candidate = distractors[(hashSeed(`${seed}-purpose-${i}`) + i) % distractors.length];
    if (!unique.some((opt) => opt.en === candidate.en)) unique.push(candidate);
    if (unique.length === 3) break;
  }

  const combined = [correct, ...unique];
  const rotate = hashSeed(`${seed}-purposerotate`) % combined.length;
  const options = combined.map((_, i) => combined[(i + rotate) % combined.length]);

  return {
    id: `${artifact.id}-purpose`,
    difficulty: 5,
    prompt: {
      bm: `Apakah kegunaan utama ${artifact.name_bm}?`,
      en: `What is the primary use of ${artifact.name_en}?`,
    },
    options,
    correctIndex: options.findIndex((opt) => opt.en === correct.en),
  };
}

/** Q8 — Cross-reference: Which artifact shares the same origin? */
function buildCrossReference(artifact: ArtifactQuizArtifact, seed: string): ArtifactQuizQuestion {
  const similar = SAME_ORIGIN_GROUPS[artifact.id] ?? [];
  // Pick one correct similar artifact name from the origin group
  const correctSimilarId = similar.length > 0
    ? similar[hashSeed(`${seed}-similar`) % similar.length]
    : "keris-panjang";
  const allArtifactNames: Record<string, Localized> = {
    "keris-panjang": { bm: "Keris Panjang", en: "Long Keris" },
    "meriam-melaka": { bm: "Meriam Melaka", en: "Malacca Cannon" },
    terabai: { bm: "Terabai", en: "Terabai" },
    tengkolok: { bm: "Tengkolok", en: "Tengkolok" },
    "baju-kurung-diraja": { bm: "Baju Kurung Diraja", en: "Royal Baju Kurung" },
    "set-perak-diraja": { bm: "Set Perak Diraja", en: "Royal Silver Set" },
    "gong-gamelan": { bm: "Gong Gamelan", en: "Gamelan Gong" },
    "rebana-ubi": { bm: "Rebana Ubi", en: "Rebana Ubi" },
    "seruling-tradisional": { bm: "Seruling Tradisional", en: "Traditional Flute" },
    "alat-tenun-songket": { bm: "Alat Tenun Songket", en: "Songket Loom" },
    "wau-bulan": { bm: "Wau Bulan", en: "Moon Kite" },
    "canting-batik": { bm: "Canting Batik", en: "Batik Canting" },
    congkak: { bm: "Congkak", en: "Congkak" },
    "diabolo-cina": { bm: "Diabolo Cina", en: "Chinese Diabolo" },
    "catur-cina": { bm: "Catur Cina", en: "Chinese Chess" },
  };

  const correctName = allArtifactNames[correctSimilarId];
  if (!correctName) {
    // Fallback: just return a simple version
    return {
      id: `${artifact.id}-crossref`,
      difficulty: 4,
      prompt: {
        bm: `Apakah asal ${artifact.name_bm}?`,
        en: `What is the origin of ${artifact.name_en}?`,
      },
      options: [],
      correctIndex: 0,
    };
  }

  // Build distractors from other artifact names (different from correct)
  const otherNames = Object.entries(allArtifactNames)
    .filter(([id]) => id !== correctSimilarId && id !== artifact.id)
    .map(([, name]) => name);

  const unique: Localized[] = [];
  for (let i = 0; i < otherNames.length; i += 1) {
    const candidate = otherNames[(hashSeed(`${seed}-xref-${i}`) + i) % otherNames.length];
    if (!unique.some((opt) => opt.en === candidate.en)) unique.push(candidate);
    if (unique.length === 3) break;
  }

  const combined = [correctName, ...unique];
  const rotate = hashSeed(`${seed}-xrefrotate`) % combined.length;
  const options = combined.map((_, i) => combined[(i + rotate) % combined.length]);

  return {
    id: `${artifact.id}-crossref`,
    difficulty: 5,
    prompt: {
      bm: `Artifak yang manakah berasal dari rantau yang SAMA dengan ${artifact.name_bm}?`,
      en: `Which artifact originates from the SAME region as ${artifact.name_en}?`,
    },
    options,
    correctIndex: options.findIndex((opt) => opt.en === correctName.en),
  };
}

/** Q9 — Composite: Which combo of era + material is correct? */
function buildCompositeQuestion(artifact: ArtifactQuizArtifact, seed: string): ArtifactQuizQuestion {
  const correctCombo: Localized = {
    bm: `${artifact.era_bm} — ${artifact.material_bm}`,
    en: `${artifact.era_en} — ${artifact.material_en}`,
  };

  // Create 3 wrong combos mixing wrong era + wrong material
  const wrongCombos: Localized[] = [];
  const usedKeys = new Set<string>();
  for (let i = 0; i < 10; i += 1) {
    const wrongEra = pickWrong(ERA_OPTIONS, artifact.era_en, `${seed}-compo-era-${i}`);
    const wrongMat = pickWrong(MATERIAL_OPTIONS, artifact.material_en, `${seed}-compo-mat-${i}`);
    const key = `${wrongEra.en}-${wrongMat.en}`;
    if (!usedKeys.has(key) && wrongEra.en !== artifact.era_en && wrongMat.en !== artifact.material_en) {
      usedKeys.add(key);
      wrongCombos.push({
        bm: `${wrongEra.bm} — ${wrongMat.bm}`,
        en: `${wrongEra.en} — ${wrongMat.en}`,
      });
      if (wrongCombos.length === 3) break;
    }
  }

  const combined = [correctCombo, ...wrongCombos];
  const rotate = hashSeed(`${seed}-comporotate`) % combined.length;
  const options = combined.map((_, i) => combined[(i + rotate) % combined.length]);

  return {
    id: `${artifact.id}-composite`,
    difficulty: 4,
    prompt: {
      bm: `Gabungan zaman dan bahan yang manakah BETUL untuk ${artifact.name_bm}?`,
      en: `Which era + material combination is CORRECT for ${artifact.name_en}?`,
    },
    options,
    correctIndex: options.findIndex((opt) => opt.en === correctCombo.en),
  };
}

/* ── Main export ── */

export function buildArtifactQuiz(artifact: ArtifactQuizArtifact, hardMode = false): ArtifactQuizQuestion[] {
  const categoryOptions = buildCategoryOptions(artifact.category, `${artifact.id}-category`);
  const eraCorrect = { bm: artifact.era_bm, en: artifact.era_en };
  const eraOptions = buildEraOptions(eraCorrect, `${artifact.id}-era`);
  const originCorrect = { bm: artifact.origin_bm, en: artifact.origin_en };
  const originOptions = buildLocalizedOptions(originCorrect, ORIGIN_OPTIONS, `${artifact.id}-origin`);
  const materialCorrect = { bm: artifact.material_bm, en: artifact.material_en };
  const materialOptions = buildLocalizedOptions(materialCorrect, MATERIAL_OPTIONS, `${artifact.id}-material`);
  const factCorrect = KEY_FACTS[artifact.id];
  const factOptions = factCorrect
    ? buildFactOptions(factCorrect, artifact.id, `${artifact.id}-fact`)
    : null;

  const questions: ArtifactQuizQuestion[] = [
    // Q1 — Easy: category
    {
      id: `${artifact.id}-category`,
      difficulty: 1,
      prompt: {
        bm: `${artifact.name_bm} tergolong dalam kategori yang mana?`,
        en: `Which category does ${artifact.name_en} belong to?`,
      },
      options: categoryOptions,
      correctIndex: categoryOptions.findIndex(
        (opt) => opt.en === CATEGORY_OPTIONS.find((item) => item.key === artifact.category)?.label.en,
      ),
    },
    // Q2 — Easy-Medium: era
    {
      id: `${artifact.id}-era`,
      difficulty: 2,
      prompt: {
        bm: `Dari zaman manakah ${artifact.name_bm}?`,
        en: `What era does ${artifact.name_en} date from?`,
      },
      options: eraOptions,
      correctIndex: eraOptions.findIndex((opt) => opt.en === artifact.era_en),
    },
    // Q3 — Medium: origin
    {
      id: `${artifact.id}-origin`,
      difficulty: 3,
      prompt: {
        bm: `Apakah asal yang disenaraikan untuk ${artifact.name_bm}?`,
        en: `Which origin is listed for ${artifact.name_en}?`,
      },
      options: originOptions,
      correctIndex: originOptions.findIndex((opt) => opt.en === artifact.origin_en),
    },
    // Q4 — Medium: material
    {
      id: `${artifact.id}-material`,
      difficulty: 4,
      prompt: {
        bm: `Apakah bahan ${artifact.name_bm}?`,
        en: `What material is ${artifact.name_en} made from?`,
      },
      options: materialOptions,
      correctIndex: materialOptions.findIndex((opt) => opt.en === artifact.material_en),
    },
  ];

  // Q5 — Hard: key fact
  if (factCorrect && factOptions) {
    questions.push({
      id: `${artifact.id}-fact`,
      difficulty: 5,
      prompt: {
        bm: `Fakta yang manakah BENAR tentang ${artifact.name_bm}?`,
        en: `Which fact is TRUE about ${artifact.name_en}?`,
      },
      options: factOptions,
      correctIndex: factOptions.findIndex((opt) => opt.en === factCorrect.en),
    });
  }

  // Hard mode: 4 additional hard questions (Q6-Q9)
  if (hardMode) {
    questions.push(buildFalseDetection(artifact, `${artifact.id}-hd1`));
    questions.push(buildPurposeQuestion(artifact, `${artifact.id}-hd2`));
    questions.push(buildCrossReference(artifact, `${artifact.id}-hd3`));
    questions.push(buildCompositeQuestion(artifact, `${artifact.id}-hd4`));
  }

  return questions;
}

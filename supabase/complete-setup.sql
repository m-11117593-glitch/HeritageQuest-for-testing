-- =============================================================================
-- HeritageQuest — Complete Database Setup
-- =============================================================================
-- 
-- This file combines ALL migrations in order into one easy-to-run script.
-- 
-- HOW TO USE:
-- 1. Go to your Supabase project → SQL Editor
-- 2. Copy the ENTIRE contents of this file
-- 3. Paste into the SQL Editor
-- 4. Click "Run" (this may take 30-60 seconds)
-- 5. Done! Your database is fully set up.
--
-- What this sets up:
--   • All tables (profiles, artifacts, badges, quests, souvenirs, etc.)
--   • Row Level Security (RLS) policies
--   • 15 seed artifacts across 5 categories
--   • 17 badges + 21 achievements (including hard mode)
--   • 5 unique quest templates
--   • 6 redeemable souvenirs
--   • 5 demo accounts for testing (password: demo123)
--   • Leaderboard season system
--   • RLS policies for leaderboard reads
--
-- =============================================================================

-- ============================================
-- MIGRATION 1: Core Schema (tables, RLS, triggers)
-- ============================================

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  language_pref TEXT NOT NULL DEFAULT 'bm',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile write" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1)));
  INSERT INTO public.user_progress (user_id) VALUES (NEW.id);
  RETURN NEW;
END; $$;

-- Artifacts (static reference)
CREATE TABLE public.artifacts (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  name_bm TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_bm TEXT NOT NULL,
  description_en TEXT NOT NULL,
  era_bm TEXT NOT NULL,
  era_en TEXT NOT NULL,
  origin_bm TEXT NOT NULL,
  origin_en TEXT NOT NULL,
  material_bm TEXT NOT NULL,
  material_en TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'archive',
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.artifacts TO authenticated;
GRANT ALL ON public.artifacts TO service_role;
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "artifacts readable" ON public.artifacts FOR SELECT TO authenticated USING (true);

-- Badges
CREATE TABLE public.badges (
  id TEXT PRIMARY KEY,
  name_bm TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_bm TEXT NOT NULL,
  description_en TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'award',
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.badges TO authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges readable" ON public.badges FOR SELECT TO authenticated USING (true);

-- Quests
CREATE TABLE public.quests (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('category','grand')),
  category TEXT,
  name_bm TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_bm TEXT NOT NULL,
  description_en TEXT NOT NULL,
  exp_reward INT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.quests TO authenticated;
GRANT ALL ON public.quests TO service_role;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quests readable" ON public.quests FOR SELECT TO authenticated USING (true);

-- Souvenirs
CREATE TABLE public.souvenirs (
  id TEXT PRIMARY KEY,
  name_bm TEXT NOT NULL,
  name_en TEXT NOT NULL,
  cost_points INT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'gift',
  sort_order INT NOT NULL DEFAULT 0
);
GRANT SELECT ON public.souvenirs TO authenticated;
GRANT ALL ON public.souvenirs TO service_role;
ALTER TABLE public.souvenirs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "souvenirs readable" ON public.souvenirs FOR SELECT TO authenticated USING (true);

-- User progress
CREATE TABLE public.user_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_exp INT NOT NULL DEFAULT 0,
  current_level INT NOT NULL DEFAULT 1,
  discount_points INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_progress TO authenticated;
GRANT ALL ON public.user_progress TO service_role;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own progress read" ON public.user_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own progress write" ON public.user_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own progress update" ON public.user_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Per-artifact progress
CREATE TABLE public.user_artifact_progress (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artifact_id TEXT NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  exp_earned INT NOT NULL DEFAULT 30,
  PRIMARY KEY (user_id, artifact_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_artifact_progress TO authenticated;
GRANT ALL ON public.user_artifact_progress TO service_role;
ALTER TABLE public.user_artifact_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own uap read" ON public.user_artifact_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own uap write" ON public.user_artifact_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User badges
CREATE TABLE public.user_badges (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ub read" ON public.user_badges FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own ub write" ON public.user_badges FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User quests
CREATE TABLE public.user_quests (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quest_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_quests TO authenticated;
GRANT ALL ON public.user_quests TO service_role;
ALTER TABLE public.user_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own uq read" ON public.user_quests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own uq write" ON public.user_quests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Redemptions
CREATE TABLE public.redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  souvenir_id TEXT NOT NULL REFERENCES public.souvenirs(id),
  points_spent INT NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.redemptions TO authenticated;
GRANT ALL ON public.redemptions TO service_role;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own red read" ON public.redemptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own red write" ON public.redemptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Trigger last (references user_progress)
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================
-- MIGRATION 2: Revoke function permissions
-- ============================================

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;


-- ============================================
-- MIGRATION 3: Seed base artifacts (12 items, 4 categories)
-- ============================================

INSERT INTO public.artifacts (id, category, name_bm, name_en, description_bm, description_en, era_bm, era_en, origin_bm, origin_en, material_bm, material_en, icon, sort_order) VALUES
('keris-panjang','weapons','Keris Panjang','Long Keris',
 'Keris panjang ialah senjata upacara diraja dengan bilah bergelombang, lambang kedaulatan dan keberanian pahlawan Melayu.',
 'The long keris is a royal ceremonial weapon with a wavy blade, symbolising sovereignty and the courage of Malay warriors.',
 'Abad ke-15','15th century','Kesultanan Melayu','Malay Sultanates','Besi tempaan dan kayu','Forged iron and wood','sword',1),
('meriam-melaka','weapons','Meriam Melaka','Malacca Cannon',
 'Meriam tembaga yang digunakan untuk mempertahankan Kota Melaka, menggambarkan kepakaran tempaan logam zaman kesultanan.',
 'A bronze cannon used to defend the fortress of Malacca, reflecting the metal-forging expertise of the sultanate era.',
 'Abad ke-15 hingga ke-16','15th to 16th century','Melaka','Malacca','Tembaga','Bronze','sword',2),
('terabai','weapons','Terabai','Terabai Shield',
 'Perisai kayu tradisional kaum Iban dan Bidayuh, dihiasi ukiran motif haiwan dan roh pelindung.',
 'A traditional wooden shield of the Iban and Bidayuh peoples, adorned with animal and guardian-spirit motifs.',
 'Abad ke-18 hingga ke-19','18th to 19th century','Sarawak','Sarawak','Kayu keras dan cat asli','Hardwood and natural pigments','shield',3),
('tengkolok','regalia','Tengkolok Diraja','Royal Tengkolok',
 'Ikat kepala rasmi pakaian diraja Melayu, dilipat mengikut gaya negeri masing-masing.',
 'The official Malay royal headdress, folded in styles distinctive to each state.',
 'Abad ke-15 hingga kini','15th century to present','Semenanjung Tanah Melayu','Malay Peninsula','Kain songket','Songket cloth','crown',4),
('baju-kurung-diraja','regalia','Baju Kurung Diraja','Royal Baju Kurung',
 'Pakaian diraja daripada sutera dan songket bersulam benang emas, dipakai dalam istiadat rasmi istana.',
 'Royal attire crafted from silk and songket with gold thread embroidery, worn during formal palace ceremonies.',
 'Abad ke-17 hingga kini','17th century to present','Istana Melayu','Malay palaces','Sutera, songket, benang emas','Silk, songket, gold thread','crown',5),
('set-perak-diraja','regalia','Set Perak Diraja','Royal Silver Set',
 'Set perkakas perak istana termasuk tepak sirih, cerana dan bekas kemenyan.',
 'A palace silverware set including betel-nut caskets, offering trays and incense holders.',
 'Abad ke-18 hingga ke-19','18th to 19th century','Kelantan dan Terengganu','Kelantan and Terengganu','Perak tulen','Pure silver','crown',6),
('gong-gamelan','music','Gong Gamelan','Gamelan Gong',
 'Gong perunggu yang menjadi tulang belakang ensembel gamelan Melayu.',
 'A bronze gong that anchors the Malay gamelan ensemble.',
 'Abad ke-18','18th century','Pahang dan Terengganu','Pahang and Terengganu','Perunggu','Bronze','music',7),
('rebana-ubi','music','Rebana Ubi','Rebana Ubi Drum',
 'Gendang besar berbentuk ubi yang dipalu semasa perayaan di pantai timur.',
 'A large tuber-shaped drum struck during festivals on the east coast.',
 'Abad ke-15 hingga kini','15th century to present','Kelantan','Kelantan','Kayu keras dan kulit lembu','Hardwood and cow hide','music',8),
('seruling-tradisional','music','Seruling Tradisional','Traditional Flute',
 'Seruling buluh yang menghasilkan nada lembut, sering dimainkan dalam Mak Yong dan Wayang Kulit.',
 'A bamboo flute producing gentle tones, often played in Mak Yong and Wayang Kulit performances.',
 'Turun-temurun','Passed down through generations','Semenanjung Tanah Melayu','Malay Peninsula','Buluh','Bamboo','music',9),
('alat-tenun-songket','crafts','Alat Tenun Songket','Songket Loom',
 'Alat tenun kayu tradisional untuk menghasilkan kain songket bersulam benang emas dan perak.',
 'A traditional wooden loom used to weave songket cloth with gold and silver thread.',
 'Abad ke-16 hingga kini','16th century to present','Terengganu dan Kelantan','Terengganu and Kelantan','Kayu, benang sutera dan benang emas','Wood, silk thread and gold thread','archive',10),
('wau-bulan','crafts','Wau Bulan','Moon Kite',
 'Layang-layang tradisional berbentuk bulan sabit dengan hiasan corak halus.',
 'A traditional crescent-moon kite decorated with intricate patterns.',
 'Abad ke-16 hingga kini','16th century to present','Kelantan','Kelantan','Buluh dan kertas berwarna','Bamboo and coloured paper','archive',11),
('canting-batik','crafts','Canting Batik','Batik Canting',
 'Alat kecil bermata tembaga untuk melukis lilin cair pada kain batik.',
 'A small copper-spouted tool used to apply molten wax onto batik cloth.',
 'Abad ke-19 hingga kini','19th century to present','Kelantan dan Terengganu','Kelantan and Terengganu','Tembaga dan kayu','Copper and wood','archive',12)
ON CONFLICT (id) DO NOTHING;


-- ============================================
-- MIGRATION 4: Badge rarity, achievements, unique quests
-- ============================================

-- Badge rarity
ALTER TABLE public.badges ADD COLUMN IF NOT EXISTS rarity text NOT NULL DEFAULT 'common';

-- Artifact image
ALTER TABLE public.artifacts ADD COLUMN IF NOT EXISTS image_url text;

-- Achievements catalog
CREATE TABLE IF NOT EXISTS public.achievements (
  id text PRIMARY KEY,
  name_bm text NOT NULL,
  name_en text NOT NULL,
  description_bm text NOT NULL,
  description_en text NOT NULL,
  icon text NOT NULL DEFAULT '🏆',
  rarity text NOT NULL DEFAULT 'common',
  requirement_key text NOT NULL,
  requirement_value int NOT NULL DEFAULT 1,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.achievements TO anon, authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements public read" ON public.achievements FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_id)
);
GRANT SELECT, INSERT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own achievements read" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own achievements insert" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Unique quest templates
CREATE TABLE IF NOT EXISTS public.unique_quest_templates (
  id text PRIMARY KEY,
  name_bm text NOT NULL,
  name_en text NOT NULL,
  description_bm text NOT NULL,
  description_en text NOT NULL,
  trigger_artifact_id text NOT NULL REFERENCES public.artifacts(id),
  target_category text NOT NULL,
  target_count int NOT NULL DEFAULT 2,
  reward_multiplier int NOT NULL DEFAULT 3,
  penalty_exp int NOT NULL DEFAULT 20,
  badge_id text,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.unique_quest_templates TO anon, authenticated;
GRANT ALL ON public.unique_quest_templates TO service_role;
ALTER TABLE public.unique_quest_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uq tmpl public read" ON public.unique_quest_templates FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.user_unique_quests (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id text NOT NULL REFERENCES public.unique_quest_templates(id) ON DELETE CASCADE,
  status text NOT NULL,
  correct_scans int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, template_id)
);
GRANT SELECT, INSERT, UPDATE ON public.user_unique_quests TO authenticated;
GRANT ALL ON public.user_unique_quests TO service_role;
ALTER TABLE public.user_unique_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own uq read" ON public.user_unique_quests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own uq insert" ON public.user_unique_quests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own uq update" ON public.user_unique_quests FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed unique quest templates
INSERT INTO public.unique_quest_templates (id, name_bm, name_en, description_bm, description_en, trigger_artifact_id, target_category, target_count, reward_multiplier, penalty_exp, badge_id, sort_order) VALUES
('uq-weapons','Jejak Pahlawan','Warrior''s Trail','Selepas menemui senjata pertama, imbas 2 senjata lain berturut-turut untuk 3× EXP dan lencana rare. Imbas kategori lain semasa aktif akan tolak 20 EXP dan gagalkan kuest.','After your first weapon, scan 2 more weapons in a row for 3× EXP and a rare badge. Scanning a different category deducts 20 EXP and fails the quest.','keris-panjang','weapons',2,3,20,'unique-explorer-weapons',1),
('uq-regalia','Jejak Istana','Royal Path','Selepas menemui pakaian diraja pertama, imbas 2 regalia lain berturut-turut untuk 3× EXP dan lencana rare.','After your first regalia, scan 2 more regalia items in a row for 3× EXP and a rare badge.','tengkolok','regalia',2,3,20,'unique-explorer-regalia',2),
('uq-music','Irama Warisan','Rhythm of Heritage','Selepas menemui alat muzik pertama, imbas 2 alat muzik lain berturut-turut untuk 3× EXP dan lencana rare.','After your first music item, scan 2 more music items in a row for 3× EXP and a rare badge.','gong-gamelan','music',2,3,20,'unique-explorer-music',3),
('uq-crafts','Tangan Seni','Artisan''s Hand','Selepas menemui kraftangan pertama, imbas 2 kraftangan lain berturut-turut untuk 3× EXP dan lencana rare.','After your first craft, scan 2 more crafts in a row for 3× EXP and a rare badge.','alat-tenun-songket','crafts',2,3,20,'unique-explorer-crafts',4)
ON CONFLICT (id) DO NOTHING;

-- Seed unique explorer rare badges
INSERT INTO public.badges (id, name_bm, name_en, description_bm, description_en, icon, sort_order, rarity) VALUES
('unique-explorer-weapons','Peneroka Unik: Senjata','Unique Explorer: Weapons','Menamatkan Jejak Pahlawan.','Completed the Warrior''s Trail.','⚔️',100,'rare'),
('unique-explorer-regalia','Peneroka Unik: Diraja','Unique Explorer: Regalia','Menamatkan Jejak Istana.','Completed the Royal Path.','👑',101,'rare'),
('unique-explorer-music','Peneroka Unik: Muzik','Unique Explorer: Music','Menamatkan Irama Warisan.','Completed the Rhythm of Heritage.','🎵',102,'rare'),
('unique-explorer-crafts','Peneroka Unik: Kraf','Unique Explorer: Crafts','Menamatkan Tangan Seni.','Completed the Artisan''s Hand.','🧵',103,'rare')
ON CONFLICT (id) DO UPDATE SET rarity = EXCLUDED.rarity;

-- Backfill existing badge rarity
UPDATE public.badges SET rarity='common' WHERE id='penemu-pertama';
UPDATE public.badges SET rarity='common' WHERE id='ahli-kuest';
UPDATE public.badges SET rarity='epic' WHERE id='separuh-jalan';
UPDATE public.badges SET rarity='legendary' WHERE id='peneroka-muzium';

-- Seed achievements
INSERT INTO public.achievements (id, name_bm, name_en, description_bm, description_en, icon, rarity, requirement_key, requirement_value, sort_order) VALUES
('ach-first-scan','Langkah Pertama','First Steps','Imbas artifak pertama anda.','Scan your first artifact.','👣','common','scans',1,1),
('ach-scan-3','Pengembara Muda','Young Wanderer','Imbas 3 artifak.','Scan 3 artifacts.','🌱','common','scans',3,2),
('ach-scan-6','Separuh Jalan','Halfway There','Imbas 6 artifak.','Scan 6 artifacts.','🌿','rare','scans',6,3),
('ach-scan-all','Kolektor Warisan','Heritage Collector','Imbas kesemua 12 artifak.','Scan all 12 artifacts.','🏆','legendary','scans',12,4),
('ach-level-3','Naik Tahap 3','Reach Level 3','Capai tahap 3.','Reach level 3.','⭐','common','level',3,5),
('ach-level-5','Naik Tahap Maksima','Max Level','Capai tahap 5.','Reach max level.','🌟','epic','level',5,6),
('ach-uq-1','Pemburu Rahsia','Secret Hunter','Namatkan satu Kuest Unik.','Complete one Unique Quest.','🗝️','rare','unique_quests',1,7),
('ach-uq-all','Legenda Unik','Unique Legend','Namatkan semua Kuest Unik.','Complete all Unique Quests.','💎','legendary','unique_quests',4,8)
ON CONFLICT (id) DO NOTHING;


-- ============================================
-- MIGRATION 5: Souvenirs
-- ============================================

INSERT INTO public.souvenirs (id, name_bm, name_en, cost_points, icon, sort_order) VALUES
  ('gift-card',   'Kad Hadiah Kedai',      'Museum Gift Card',       18, 'gift',    1),
  ('discount-15', 'Kad Diskaun 15%',       '15% Discount Card',      10, 'ticket',  2),
  ('discount-30', 'Kad Diskaun 30%',       '30% Discount Card',      20, 'percent', 3),
  ('poskad',      'Poskad Warisan',        'Heritage Postcard',       5, 'mail',    4),
  ('magnet',      'Magnet Peti Sejuk',     'Fridge Magnet',           8, 'magnet',  5),
  ('baju-t',      'Baju-T HeritageQuest',  'HeritageQuest T-Shirt',  25, 'shirt',   6)
ON CONFLICT (id) DO UPDATE SET
  name_bm = EXCLUDED.name_bm,
  name_en = EXCLUDED.name_en,
  cost_points = EXCLUDED.cost_points,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;


-- ============================================
-- MIGRATION 6: Traditional toys category (3 new artifacts)
-- ============================================

INSERT INTO public.artifacts (id, category, name_bm, name_en, description_bm, description_en, era_bm, era_en, origin_bm, origin_en, material_bm, material_en, icon, image_url, sort_order) VALUES
('congkak', 'toys',
 'Congkak', 'Congkak',
 'Congkak ialah permainan papan tradisional Melayu yang dimainkan oleh dua orang. Papan kayu berbentuk perahu ini mempunyai dua baris lubang kecil dan dua "rumah" di hujungnya. Pemain bergilir-gilir mengagihkan guli atau biji getah ke dalam lubang, dan pemain yang mengumpul paling banyak biji di rumahnya menang. Permainan ini melatih kiraan pantas dan strategi, dan sering dimainkan di beranda rumah kampung.',
 'Congkak is a traditional Malay board game for two players. The boat-shaped wooden board has two rows of small pits and two larger "storehouses" at the ends. Players take turns sowing marbles or rubber seeds into the pits, and whoever gathers the most seeds in their storehouse wins. The game sharpens quick counting and strategy, and was often played on the verandahs of village houses.',
 'Abad ke-15 hingga kini', '15th century to present',
 'Semenanjung Tanah Melayu', 'Malay Peninsula',
 'Kayu keras, guli atau biji getah', 'Hardwood, marbles or rubber seeds',
 'archive', '/artifacts/congkak.jpg', 13),
('diabolo-cina', 'toys',
 'Diabolo Cina', 'Chinese Diabolo',
 'Diabolo Cina, atau kongzhu, ialah alat permainan berbentuk jam pasir yang diputar dan dilambung menggunakan tali yang diikat pada dua batang kayu. Apabila berputar laju, diabolo mengeluarkan bunyi berdengung yang unik. Permainan berusia lebih 1,000 tahun ini dibawa masuk oleh komuniti Cina dan menjadi persembahan popular semasa perayaan Tahun Baru Cina di Malaysia.',
 'The Chinese diabolo, or kongzhu, is an hourglass-shaped toy spun and tossed on a string tied between two hand sticks. When it spins fast, the diabolo produces a distinctive humming sound. Over 1,000 years old, this pastime was brought by the Chinese community and became a popular performance during Chinese New Year celebrations in Malaysia.',
 'Lebih 1,000 tahun', 'Over 1,000 years old',
 'China; komuniti Cina Malaysia', 'China; Malaysian Chinese community',
 'Buluh, kayu dan tali', 'Bamboo, wood and string',
 'archive', '/artifacts/diabolo-cina.jpg', 14),
('catur-cina', 'toys',
 'Catur Cina', 'Chinese Chess (Xiangqi)',
 'Catur Cina, atau xiangqi, ialah permainan strategi dua pemain yang dimainkan di atas papan bergrid dengan "sungai" di tengahnya. Buah catur berbentuk cakera kayu ditanda dengan aksara Cina merah dan hitam, mewakili jeneral, gajah, kuda dan askar. Permainan ini sangat digemari di kedai kopi dan rumah kongsi, mengasah pemikiran taktikal merentas generasi.',
 'Chinese chess, or xiangqi, is a two-player strategy game played on a gridded board divided by a central "river". The wooden disc pieces are marked with red and black Chinese characters representing generals, elephants, horses and soldiers. Beloved in coffee shops and clan houses, the game has sharpened tactical thinking across generations.',
 'Lebih 1,500 tahun', 'Over 1,500 years old',
 'China; komuniti Cina Malaysia', 'China; Malaysian Chinese community',
 'Kayu dan dakwat', 'Wood and ink',
 'archive', '/artifacts/catur-cina.jpg', 15)
ON CONFLICT (id) DO NOTHING;

-- Category quest for toys
INSERT INTO public.quests (id, type, category, name_bm, name_en, description_bm, description_en, exp_reward, sort_order) VALUES
('quest-toys', 'category', 'toys',
 'Pakar Mainan Tradisional', 'Traditional Toys Expert',
 'Imbas ketiga-tiga mainan tradisional di Ruang Mainan Tradisional.',
 'Scan all 3 traditional toys in the Traditional Toys Corner.',
 50, 5)
ON CONFLICT (id) DO NOTHING;

-- Rescale milestones from 12 artifacts to 15
UPDATE public.achievements SET requirement_value = 15,
  description_bm = REPLACE(description_bm, '12', '15'),
  description_en = REPLACE(description_en, '12', '15')
WHERE requirement_key = 'scans' AND requirement_value = 12;

UPDATE public.achievements SET requirement_value = 8,
  description_bm = REPLACE(description_bm, '6', '8'),
  description_en = REPLACE(description_en, '6', '8')
WHERE requirement_key = 'scans' AND requirement_value = 6;

UPDATE public.quests SET
  description_bm = REPLACE(description_bm, '12', '15'),
  description_en = REPLACE(description_en, '12', '15')
WHERE id = 'quest-grand';

UPDATE public.badges SET
  description_bm = REPLACE(REPLACE(description_bm, '12', '15'), ' 6 ', ' 8 '),
  description_en = REPLACE(REPLACE(description_en, '12', '15'), ' 6 ', ' 8 ')
WHERE id IN ('peneroka-muzium', 'separuh-jalan');


-- ============================================
-- MIGRATION 7: Toys unique quest
-- ============================================

INSERT INTO public.unique_quest_templates (
  id, name_bm, name_en, description_bm, description_en,
  trigger_artifact_id, target_category, target_count,
  reward_multiplier, penalty_exp, badge_id, sort_order
) VALUES (
  'uq-toys',
  'Semangat Bermain',
  'Spirit of Play',
  'Selepas menemui mainan tradisional pertama, imbas 2 mainan lain berturut-turut untuk 3× EXP dan lencana rare. Imbas kategori lain semasa aktif akan tolak 20 EXP dan gagalkan kuest.',
  'After your first traditional toy, scan 2 more toys in a row for 3× EXP and a rare badge. Scanning a different category deducts 20 EXP and fails the quest.',
  'congkak', 'toys', 2, 3, 20, 'unique-explorer-toys', 5
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.badges (id, name_bm, name_en, description_bm, description_en, icon, sort_order, rarity) VALUES
('unique-explorer-toys', 'Peneroka Unik: Mainan', 'Unique Explorer: Toys',
 'Menamatkan Semangat Bermain.', 'Completed the Spirit of Play.',
 '🪀', 104, 'rare')
ON CONFLICT (id) DO UPDATE SET rarity = EXCLUDED.rarity;

-- Rescale "complete all Unique Quests" from 4 → 5
UPDATE public.achievements
SET requirement_value = 5
WHERE id = 'ach-uq-all' AND requirement_key = 'unique_quests';


-- ============================================
-- MIGRATION 8: Backfill artifact images and all quests
-- ============================================

UPDATE public.artifacts AS a
SET image_url = v.image_url
FROM (VALUES
  ('keris-panjang', '/artifacts/keris-panjang.jpg'),
  ('meriam-melaka', '/artifacts/meriam-melaka.jpg'),
  ('terabai', '/artifacts/terabai.jpg'),
  ('tengkolok', '/artifacts/tengkolok.jpg'),
  ('baju-kurung-diraja', '/artifacts/baju-kurung-diraja.jpg'),
  ('set-perak-diraja', '/artifacts/set-perak-diraja.jpg'),
  ('gong-gamelan', '/artifacts/gong-gamelan.jpg'),
  ('rebana-ubi', '/artifacts/rebana-ubi.jpg'),
  ('seruling-tradisional', '/artifacts/seruling-tradisional.jpg'),
  ('alat-tenun-songket', '/artifacts/alat-tenun-songket.jpg'),
  ('wau-bulan', '/artifacts/wau-bulan.jpg'),
  ('canting-batik', '/artifacts/canting-batik.jpg'),
  ('congkak', '/artifacts/congkak.jpg'),
  ('diabolo-cina', '/artifacts/diabolo-cina.jpg'),
  ('catur-cina', '/artifacts/catur-cina.jpg')
) AS v(id, image_url)
WHERE a.id = v.id;

INSERT INTO public.quests (
  id, type, category, name_bm, name_en,
  description_bm, description_en, exp_reward, sort_order
) VALUES
  ('quest-weapons', 'category', 'weapons',
   'Pakar Senjata Tradisional', 'Traditional Weapons Expert',
   'Imbas ketiga-tiga senjata tradisional di Dewan Senjata.',
   'Scan all 3 traditional weapons in the Weapons Hall.',
   50, 1),
  ('quest-regalia', 'category', 'regalia',
   'Pakar Diraja', 'Royal Regalia Expert',
   'Imbas ketiga-tiga artifak diraja di Balai Diraja.',
   'Scan all 3 royal regalia artifacts in the Royal Gallery.',
   50, 2),
  ('quest-music', 'category', 'music',
   'Pakar Irama Warisan', 'Traditional Music Expert',
   'Imbas ketiga-tiga alat muzik tradisional di Dewan Muzik.',
   'Scan all 3 traditional instruments in the Music Hall.',
   50, 3),
  ('quest-crafts', 'category', 'crafts',
   'Pakar Kraftangan Warisan', 'Heritage Handicrafts Expert',
   'Imbas ketiga-tiga kraftangan warisan di Studio Kraftangan.',
   'Scan all 3 heritage handicrafts in the Crafts Studio.',
   50, 4),
  ('quest-toys', 'category', 'toys',
   'Pakar Mainan Tradisional', 'Traditional Toys Expert',
   'Imbas ketiga-tiga mainan tradisional di Ruang Mainan Tradisional.',
   'Scan all 3 traditional toys in the Traditional Toys Corner.',
   50, 5),
  ('quest-grand', 'grand', null,
   'Peneroka Muzium', 'Museum Explorer',
   'Imbas kesemua 15 artifak di Muzium Warisan Malaysia.',
   'Scan all 15 artifacts in Muzium Warisan Malaysia.',
   100, 99)
ON CONFLICT (id) DO UPDATE SET
  type = EXCLUDED.type,
  category = EXCLUDED.category,
  name_bm = EXCLUDED.name_bm,
  name_en = EXCLUDED.name_en,
  description_bm = EXCLUDED.description_bm,
  description_en = EXCLUDED.description_en,
  exp_reward = EXCLUDED.exp_reward,
  sort_order = EXCLUDED.sort_order;


-- ============================================
-- MIGRATION 9: Quiz columns on user_artifact_progress
-- ============================================

ALTER TABLE user_artifact_progress 
ADD COLUMN quiz_correct_count INTEGER,
ADD COLUMN quiz_total_questions INTEGER,
ADD COLUMN quiz_completed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN user_artifact_progress.quiz_correct_count IS 'Number of correct answers in the artifact quiz';
COMMENT ON COLUMN user_artifact_progress.quiz_total_questions IS 'Total number of questions in the artifact quiz';
COMMENT ON COLUMN user_artifact_progress.quiz_completed_at IS 'Timestamp when the quiz was completed';


-- ============================================
-- MIGRATION 10: Fix UAP RLS (add UPDATE policy)
-- ============================================

CREATE POLICY "own uap update" ON public.user_artifact_progress 
FOR UPDATE TO authenticated 
USING (auth.uid() = user_id);


-- ============================================
-- MIGRATION 11: Leaderboard seasons
-- ============================================

CREATE TABLE public.leaderboard_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_bm TEXT NOT NULL,
  name_en TEXT NOT NULL,
  season_type TEXT NOT NULL CHECK (season_type IN ('weekly', 'monthly')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finalized')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalized_at TIMESTAMPTZ
);
GRANT SELECT ON public.leaderboard_seasons TO authenticated;
GRANT ALL ON public.leaderboard_seasons TO service_role;
ALTER TABLE public.leaderboard_seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seasons readable" ON public.leaderboard_seasons FOR SELECT TO authenticated USING (true);

CREATE TABLE public.leaderboard_season_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.leaderboard_seasons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rank INT NOT NULL,
  total_exp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  scan_count INT NOT NULL DEFAULT 0,
  badge_count INT NOT NULL DEFAULT 0,
  reward_points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (season_id, user_id)
);
GRANT SELECT ON public.leaderboard_season_entries TO authenticated;
GRANT ALL ON public.leaderboard_season_entries TO service_role;
ALTER TABLE public.leaderboard_season_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entries readable" ON public.leaderboard_season_entries FOR SELECT TO authenticated USING (true);

INSERT INTO public.leaderboard_seasons (name_bm, name_en, season_type, start_date, end_date, status)
VALUES ('Musim 1', 'Season 1', 'weekly', '2026-07-11T00:00:00Z', '2026-07-18T00:00:00Z', 'active');


-- ============================================
-- MIGRATION 12: Seed demo users (5 accounts for testing)
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  demo RECORD;
  v_user_id UUID;
  demo_email TEXT;
  artifact_ids TEXT[] := ARRAY[
    'keris-panjang', 'meriam-melaka', 'terabai',
    'tengkolok', 'baju-kurung-diraja', 'set-perak-diraja',
    'gong-gamelan', 'rebana-ubi', 'seruling-tradisional',
    'alat-tenun-songket', 'wau-bulan', 'canting-batik',
    'congkak', 'diabolo-cina', 'catur-cina'
  ];
  scan_exp INT;
  art_id TEXT;
  badge_ids TEXT[];
  b_id TEXT;
  i INT;
  existing_id UUID;
BEGIN

  INSERT INTO public.badges (id, name_bm, name_en, description_bm, description_en, icon, sort_order, rarity) VALUES
    ('penemu-pertama', 'Penemu Pertama', 'First Discovery', 'Imbas artifak pertama anda.', 'Scan your first artifact.', '🔍', 1, 'common'),
    ('ahli-kuest', 'Ahli Kuest', 'Quest Adept', 'Selesaikan satu kuest kategori.', 'Complete one category quest.', '📜', 2, 'common'),
    ('separuh-jalan', 'Separuh Jalan', 'Halfway There', 'Imbas 8 daripada 15 artifak.', 'Scan 8 of 15 artifacts.', '🌿', 3, 'epic'),
    ('peneroka-muzium', 'Peneroka Muzium', 'Museum Explorer', 'Imbas kesemua 15 artifak.', 'Scan all 15 artifacts.', '🏆', 4, 'legendary')
  ON CONFLICT (id) DO NOTHING;

  FOR demo IN
    SELECT * FROM (VALUES
      ('Pengembara1'::TEXT,  580::INT, 5::INT, 15::INT),
      ('JelajahSetia'::TEXT, 520::INT, 5::INT, 14::INT),
      ('WarisanKu'::TEXT,    460::INT, 4::INT, 13::INT),
      ('BudayaAbadi'::TEXT,  400::INT, 4::INT, 12::INT),
      ('SejarahMuda'::TEXT,  340::INT, 4::INT, 11::INT)
    ) AS t(username, total_exp, level, scan_count)
  LOOP
    demo_email := LOWER(REPLACE(demo.username, ' ', '')) || '@heritagequest.demo';

    SELECT id INTO existing_id FROM auth.users WHERE email = demo_email;
    IF FOUND THEN
      CONTINUE;
    END IF;

    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, aud, role,
      instance_id, created_at, updated_at, is_sso_user
    ) VALUES (
      v_user_id,
      demo_email,
      extensions.crypt('demo123', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('username', demo.username),
      'authenticated',
      'authenticated',
      '00000000-0000-0000-0000-000000000000',
      now(),
      now(),
      false
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, last_sign_in_at,
      created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id, 'email', demo_email),
      'email',
      now(),
      now(),
      now()
    );

    UPDATE public.user_progress
    SET
      total_exp = demo.total_exp,
      current_level = demo.level,
      discount_points = (demo.level - 1) * 5,
      updated_at = now()
    WHERE public.user_progress.user_id = v_user_id;

    IF demo.scan_count > 0 THEN
      scan_exp := 10;
      FOR i IN 1..demo.scan_count LOOP
        art_id := artifact_ids[i];
        INSERT INTO public.user_artifact_progress (user_id, artifact_id, exp_earned, scanned_at)
        VALUES (v_user_id, art_id, scan_exp, now() - (demo.scan_count - i) * INTERVAL '1 minute');
      END LOOP;
    END IF;

    badge_ids := '{}';
    IF demo.scan_count >= 1 THEN badge_ids := array_append(badge_ids, 'penemu-pertama'); END IF;
    IF demo.scan_count >= 3 THEN badge_ids := array_append(badge_ids, 'ahli-kuest'); END IF;
    IF demo.scan_count >= 8 THEN badge_ids := array_append(badge_ids, 'separuh-jalan'); END IF;
    IF demo.scan_count = 15 THEN badge_ids := array_append(badge_ids, 'peneroka-muzium'); END IF;

    FOREACH b_id IN ARRAY badge_ids
    LOOP
      INSERT INTO public.user_badges (user_id, badge_id, earned_at)
      VALUES (v_user_id, b_id, now() - INTERVAL '1 hour');
    END LOOP;

  END LOOP;

END $$;


-- ============================================
-- MIGRATION 13: Refresh achievements and badges with JPEG icons
-- ============================================

DELETE FROM public.user_achievements
WHERE achievement_id IN ('ach-scan-3', 'ach-scan-6', 'ach-level-3');

DELETE FROM public.achievements
WHERE id IN ('ach-scan-3', 'ach-scan-6', 'ach-level-3');

INSERT INTO public.achievements (id, name_bm, name_en, description_bm, description_en, icon, rarity, requirement_key, requirement_value, sort_order) VALUES
('ach-first-scan', 'Langkah Pertama', 'First Steps',
 'Imbas artifak pertama anda.', 'Scan your first artifact.',
 'first-scan.jpg', 'common', 'scans', 1, 1),
('ach-scan-5', 'Pengembara Muda', 'Young Explorer',
 'Imbas 5 artifak.', 'Scan 5 artifacts.',
 '5-scaned.jpg', 'common', 'scans', 5, 2),
('ach-scan-10', 'Penjelajah Berpengalaman', 'Seasoned Explorer',
 'Imbas 10 artifak.', 'Scan 10 artifacts.',
 '10-scaned.jpg', 'rare', 'scans', 10, 3),
('ach-scan-all', 'Kolektor Warisan', 'Heritage Collector',
 'Imbas kesemua 15 artifak.', 'Scan all 15 artifacts.',
 'all-scaned.jpg', 'legendary', 'scans', 15, 4),
('ach-level-5', 'Naik Tahap 5', 'Reach Level 5',
 'Capai tahap 5.', 'Reach level 5.',
 'level-up-5.jpg', 'epic', 'level', 5, 5),
('ach-level-10', 'Naik Tahap 10', 'Reach Level 10',
 'Capai tahap 10.', 'Reach level 10.',
 'level-up-10.jpg', 'legendary', 'level', 10, 6),
('ach-uq-1', 'Pemburu Rahsia', 'Secret Hunter',
 'Selesaikan satu Kuest Unik.', 'Complete one Unique Quest.',
 'first-quest.jpg', 'rare', 'unique_quests', 1, 7),
('ach-uq-all', 'Legenda Unik', 'Unique Legend',
 'Selesaikan semua Kuest Unik.', 'Complete all Unique Quests.',
 'quest-master.jpg', 'legendary', 'unique_quests', 5, 8),
('ach-perfect-quiz', 'Juara Kuiz', 'Quiz Champion',
 'Dapatkan skor sempurna dalam 3 kuiz.', 'Get a perfect score on 3 quizzes.',
 'perfect-quiz-3.jpg', 'rare', 'perfect_quizzes', 3, 9),
('ach-teka-sahih', 'Teka Sahih!', 'Correct Answers',
 'Kumpul 30 jawapan betul dalam kuiz.', 'Accumulate 30 correct quiz answers.',
 'teka-sahih.jpg', 'epic', 'total_correct', 30, 10),
('ach-social-top', 'Pengembara Teratas', 'Top Explorer',
 'Menjadi juara mingguan papan pemimpin.', 'Become the weekly leaderboard champion.',
 'social-top.jpg', 'legendary', 'leaderboard_rank', 1, 11)
ON CONFLICT (id) DO UPDATE SET
  name_bm = EXCLUDED.name_bm,
  name_en = EXCLUDED.name_en,
  description_bm = EXCLUDED.description_bm,
  description_en = EXCLUDED.description_en,
  icon = EXCLUDED.icon,
  rarity = EXCLUDED.rarity,
  requirement_key = EXCLUDED.requirement_key,
  requirement_value = EXCLUDED.requirement_value,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.badges (id, name_bm, name_en, description_bm, description_en, icon, sort_order, rarity) VALUES
('penemu-pertama', 'Penemu Pertama', 'First Discovery',
 'Imbas artifak pertama anda.', 'Scan your first artifact.',
 'penemu-pertama.jpg', 1, 'common'),
('ahli-kuest', 'Ahli Kuest', 'Quest Adept',
 'Selesaikan satu kuest kategori.', 'Complete one category quest.',
 'ahli-kuest.jpg', 2, 'common'),
('separuh-jalan', 'Separuh Jalan', 'Halfway There',
 'Imbas 8 daripada 15 artifak.', 'Scan 8 of 15 artifacts.',
 'separuh-jalan.jpg', 3, 'epic'),
('peneroka-muzium', 'Peneroka Muzium', 'Museum Explorer',
 'Imbas kesemua 15 artifak.', 'Scan all 15 artifacts.',
 'peneroka-muzium.jpg', 4, 'legendary'),
('unique-explorer-weapons', 'Peneroka Unik: Senjata', 'Unique Explorer: Weapons',
 'Menamatkan Jejak Pahlawan.', 'Completed the Warrior''s Trail.',
 'unique-explorer-weapons.jpg', 100, 'rare'),
('unique-explorer-regalia', 'Peneroka Unik: Diraja', 'Unique Explorer: Regalia',
 'Menamatkan Jejak Istana.', 'Completed the Royal Path.',
 'unique-explorer-regalia.jpg', 101, 'rare'),
('unique-explorer-music', 'Peneroka Unik: Muzik', 'Unique Explorer: Music',
 'Menamatkan Irama Warisan.', 'Completed the Rhythm of Heritage.',
 'unique-explorer-music.jpg', 102, 'rare'),
('unique-explorer-crafts', 'Peneroka Unik: Kraf', 'Unique Explorer: Crafts',
 'Menamatkan Tangan Seni.', 'Completed the Artisan''s Hand.',
 'unique-explorer-crafts.jpg', 103, 'rare'),
('unique-explorer-toys', 'Peneroka Unik: Mainan', 'Unique Explorer: Toys',
 'Menamatkan Semangat Bermain.', 'Completed the Spirit of Play.',
 'unique-explorer-toys.jpg', 104, 'rare'),
('detik-sejarah', 'Detik Sejarah', 'Historic Moment',
 'Mencapai pencapaian istimewa dalam perjalanan anda.', 'Reach a special milestone in your journey.',
 'detik-sejarah.jpg', 200, 'epic'),
('jamuan-budaya', 'Jamuan Budaya', 'Cultural Feast',
 'Terokai kepelbagaian warisan budaya Malaysia.', 'Explore the diversity of Malaysian cultural heritage.',
 'jamuan-budaya.jpg', 201, 'rare'),
('jantung-warisan', 'Jantung Warisan', 'Heart of Heritage',
 'Menjadi pelindung setia warisan negara.', 'Become a devoted guardian of national heritage.',
 'jantung-warisan.jpg', 202, 'legendary')
ON CONFLICT (id) DO UPDATE SET
  name_bm = EXCLUDED.name_bm,
  name_en = EXCLUDED.name_en,
  description_bm = EXCLUDED.description_bm,
  description_en = EXCLUDED.description_en,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  rarity = EXCLUDED.rarity;


-- ============================================
-- MIGRATION 14: Fix badge emoji icons (unique explorer badges)
-- ============================================

UPDATE public.badges
SET icon = CASE id
  WHEN 'unique-explorer-weapons' THEN '⚔️'
  WHEN 'unique-explorer-regalia' THEN '👑'
  WHEN 'unique-explorer-music'   THEN '🎵'
  WHEN 'unique-explorer-crafts'  THEN '🧵'
  WHEN 'unique-explorer-toys'    THEN '🪀'
END
WHERE id IN ('unique-explorer-weapons','unique-explorer-regalia','unique-explorer-music','unique-explorer-crafts','unique-explorer-toys');


-- ============================================
-- MIGRATION 15: Remove extra demo users (keep only 5)
-- ============================================

DO $$
DECLARE
  v_user_id UUID;
  usernames_to_remove TEXT[] := ARRAY[
    'TanahAirKu', 'MelayuJati', 'BumiKenyalang', 'SultanMerah',
    'PahlawanEsa', 'SeriPantai', 'IntanBaik', 'WiraMalaya',
    'RimbaRaya', 'MutiaraTimur', 'CempakaSari', 'TerataiPagi',
    'PelangiSenja', 'BintangFajar', 'AnakMuda'
  ];
  u TEXT;
BEGIN
  FOREACH u IN ARRAY usernames_to_remove
  LOOP
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = LOWER(REPLACE(u, ' ', '')) || '@heritagequest.demo';

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    DELETE FROM public.user_artifact_progress WHERE user_id = v_user_id;
    DELETE FROM public.user_badges WHERE user_id = v_user_id;
    DELETE FROM public.user_quests WHERE user_id = v_user_id;
    DELETE FROM public.user_achievements WHERE user_id = v_user_id;
    DELETE FROM public.user_unique_quests WHERE user_id = v_user_id;
    DELETE FROM public.redemptions WHERE user_id = v_user_id;
    DELETE FROM public.user_progress WHERE user_id = v_user_id;
    DELETE FROM public.profiles WHERE id = v_user_id;
    DELETE FROM auth.identities WHERE user_id = v_user_id;
    DELETE FROM auth.users WHERE id = v_user_id;
  END LOOP;
END $$;


-- ============================================
-- MIGRATION 16: Hard mode badges and achievements
-- ============================================

DO $$ BEGIN
  ALTER TABLE public.user_artifact_progress ADD COLUMN is_hard_mode boolean DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

INSERT INTO public.badges (id, name_bm, name_en, description_bm, description_en, icon, sort_order, rarity) VALUES
  ('pencabar-sukar',  'Pencabar Sukar',  'Hard Challenger',   'Selesaikan satu kuiz mod sukar.',                          'Complete one hard mode quiz.',                     'pencabar-sukar.jpg',  5, 'rare'),
  ('pemikir-tajam',   'Pemikir Tajam',   'Sharp Thinker',     'Skor 7/9 atau lebih dalam mod sukar.',                     'Score 7/9 or higher in hard mode.',                'pemikir-tajam.jpg',   6, 'epic'),
  ('kebal-cabaran',   'Kebal Cabaran',   'Challenge-Proof',   'Selesaikan 3 kuiz mod sukar berturut-turut tanpa gagal.',  'Complete 3 hard mode quizzes in a row.',           'kebal-cabaran.jpg',   7, 'epic'),
  ('mahir-sukar',     'Mahir Sukar',     'Hard Master',       'Skor 9/9 dalam mod sukar.',                                'Score 9/9 in hard mode.',                          'mahir-sukar.jpg',     8, 'legendary'),
  ('legenda-sukar',   'Legenda Sukar',   'Hard Legend',       'Selesaikan kesemua 15 kuiz mod sukar.',                    'Complete all 15 hard mode quizzes.',               'legenda-sukar.jpg',   9, 'legendary')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.achievements (id, name_bm, name_en, description_bm, description_en, icon, rarity, requirement_key, requirement_value, sort_order) VALUES
  ('h-quiz-first',       'Langkah Pertama',    'First Step',          'Selesaikan kuiz pertama dalam mod sukar.',                'Complete your first hard mode quiz.',              'h-quiz-first.jpg',         'common',    'hard_quizzes',        1,  12),
  ('h-quiz-five',        'Semakin Hebat',      'Getting Stronger',    'Selesaikan 5 kuiz mod sukar.',                            'Complete 5 hard mode quizzes.',                    'h-quiz-five.jpg',          'rare',      'hard_quizzes',        5,  13),
  ('h-quiz-all',         'Penakluk Sukar',     'Hard Conqueror',      'Selesaikan kesemua 15 kuiz mod sukar.',                   'Complete all 15 hard mode quizzes.',               'h-quiz-all.jpg',           'legendary', 'hard_quizzes',        15, 14),
  ('h-perfect-one',      'Hampir Sempurna',    'Nearly Perfect',      'Skor 9/9 dalam satu kuiz mod sukar.',                     'Score 9/9 in one hard mode quiz.',                 'h-quiz-perfect-one.jpg',   'rare',      'hard_perfect',        1,  15),
  ('h-perfect-three',    'Tiga Sempurna',      'Triple Perfect',      'Skor 9/9 dalam 3 kuiz mod sukar.',                        'Score 9/9 in 3 hard mode quizzes.',                'h-quiz-perfect-three.jpg', 'epic',      'hard_perfect',        3,  16),
  ('h-streak-3',         'Rentak Sukar',       'Hard Streak',         'Dapatkan 3 jawapan betul berturut-turut dalam mod sukar.', 'Get 3 correct answers in a row in hard mode.',     'h-streak-3.jpg',           'rare',      'hard_streak',         3,  17),
  ('h-streak-5',         'Rentak Kebal',       'Unbreakable Streak',  'Dapatkan 5 jawapan betul berturut-turut dalam mod sukar.', 'Get 5 correct answers in a row in hard mode.',     'h-streak-5.jpg',           'epic',      'hard_streak',         5,  18),
  ('h-total-30',         'Pengumpul Mata',     'Point Collector',     'Kumpul 30 jawapan betul dalam mod sukar.',                'Collect 30 correct answers in hard mode.',         'h-quiz-total-30.jpg',      'rare',      'hard_total_correct',  30, 19),
  ('h-total-60',         'Sarjana Sukar',      'Hard Scholar',        'Kumpul 60 jawapan betul dalam mod sukar.',                'Collect 60 correct answers in hard mode.',         'h-quiz-total-60.jpg',      'epic',      'hard_total_correct',  60, 20),
  ('h-total-100',        'Sarjana Agung',      'Grand Scholar',       'Kumpul 100 jawapan betul dalam mod sukar.',               'Collect 100 correct answers in hard mode.',        'h-quiz-total-100.jpg',     'legendary', 'hard_total_correct',  100,21)
ON CONFLICT (id) DO NOTHING;


-- ============================================
-- MIGRATION 17: Leaderboard RLS policies
-- ============================================

CREATE POLICY "read all profiles for leaderboard" ON public.profiles 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "read all progress for leaderboard" ON public.user_progress 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "read all scans for leaderboard" ON public.user_artifact_progress 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "read all badges for leaderboard" ON public.user_badges 
  FOR SELECT TO authenticated USING (true);


-- ============================================
-- MIGRATION 18: Admin system — roles, images, quiz storage
-- ============================================

-- Add role column to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

COMMENT ON COLUMN public.profiles.role IS 'User role: user (default) or admin (full CRUD access)';

-- Add extra image columns to artifacts
ALTER TABLE public.artifacts 
  ADD COLUMN IF NOT EXISTS image_url_2 TEXT,
  ADD COLUMN IF NOT EXISTS image_url_3 TEXT;

COMMENT ON COLUMN public.artifacts.image_url_2 IS 'Second artifact image URL (admin upload)';
COMMENT ON COLUMN public.artifacts.image_url_3 IS 'Third artifact image URL (admin upload)';

-- Create artifact_quiz_questions table
CREATE TABLE IF NOT EXISTS public.artifact_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id TEXT NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  prompt_bm TEXT NOT NULL,
  prompt_en TEXT NOT NULL,
  options_bm JSONB NOT NULL,
  options_en JSONB NOT NULL,
  correct_index INT NOT NULL CHECK (correct_index >= 0),
  difficulty INT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.artifact_quiz_questions IS 'Admin-created quiz questions for artifacts. Replaces legacy client-side generation when populated.';

CREATE INDEX IF NOT EXISTS idx_artifact_quiz_questions_artifact_id 
  ON public.artifact_quiz_questions(artifact_id);

CREATE INDEX IF NOT EXISTS idx_artifact_quiz_questions_sort_order 
  ON public.artifact_quiz_questions(artifact_id, sort_order);

GRANT SELECT ON public.artifact_quiz_questions TO authenticated;
GRANT ALL ON public.artifact_quiz_questions TO service_role;

ALTER TABLE public.artifact_quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_questions_readable" 
  ON public.artifact_quiz_questions FOR SELECT TO authenticated USING (true);

-- Insert/update/delete are done via supabaseAdmin (service_role),
-- which bypasses RLS entirely. No additional policies needed.

-- Promote-to-admin helper function
CREATE OR REPLACE FUNCTION public.promote_to_admin(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET role = 'admin'
  WHERE id = target_user_id;
  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.promote_to_admin IS 'Promotes a user to admin role. Run via Supabase SQL dashboard: SELECT promote_to_admin(''<user-uuid>'');';

REVOKE EXECUTE ON FUNCTION public.promote_to_admin FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_to_admin TO service_role;

-- Storage bucket for artifact images (idempotent)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
SELECT 'artifact-images', 'artifact-images', true, false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'artifact-images');

INSERT INTO storage.policies (name, bucket_id, operation, definition, owner)
SELECT 'Public Read', 'artifact-images', 'SELECT', 'true', NULL
WHERE NOT EXISTS (SELECT 1 FROM storage.policies WHERE name = 'Public Read' AND bucket_id = 'artifact-images' AND operation = 'SELECT');

INSERT INTO storage.policies (name, bucket_id, operation, definition, owner)
SELECT 'Admin Upload', 'artifact-images', 'INSERT', 'true', NULL
WHERE NOT EXISTS (SELECT 1 FROM storage.policies WHERE name = 'Admin Upload' AND bucket_id = 'artifact-images' AND operation = 'INSERT');


-- =============================================================================
-- ✅ DONE! Your database is fully set up.
-- =============================================================================
--
-- Admin setup:
--   1. Create a user account normally through the app
--   2. Get the user's UUID from Supabase Auth → Users
--   3. Run: SELECT promote_to_admin('<user-uuid>');
--   4. User signs out and signs back in → sees admin panel!
--
-- Demo accounts (password: demo123):
--   pengembara1@heritagequest.demo
--   jelajahsetia@heritagequest.demo
--   warisanku@heritagequest.demo
--   budayaabadi@heritagequest.demo
--   sejarahmuda@heritagequest.demo
--
-- Next steps:
--   1. Copy your Supabase URL + anon key to .env
--   2. Run: bun install && bun run dev
--   3. Open http://localhost:8080
--
-- =============================================================================

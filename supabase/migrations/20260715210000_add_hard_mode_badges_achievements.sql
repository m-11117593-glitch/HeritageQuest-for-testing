-- Add is_hard_mode column to user_artifact_progress (idempotent)
DO $$ BEGIN
  ALTER TABLE public.user_artifact_progress ADD COLUMN is_hard_mode boolean DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Seed 5 hard mode badges and 10 hard mode achievements (9 original + h-total-100)
-- Idempotent: skips entries whose id already exists

-- 1. Hard Mode Badges (sort_order 5-9) — icons point to actual image filenames
INSERT INTO public.badges (id, name_bm, name_en, description_bm, description_en, icon, sort_order, rarity) VALUES
  ('pencabar-sukar',  'Pencabar Sukar',  'Hard Challenger',   'Selesaikan satu kuiz mod sukar.',                          'Complete one hard mode quiz.',                     'pencabar-sukar.jpg',  5, 'rare'),
  ('pemikir-tajam',   'Pemikir Tajam',   'Sharp Thinker',     'Skor 7/9 atau lebih dalam mod sukar.',                     'Score 7/9 or higher in hard mode.',                'pemikir-tajam.jpg',   6, 'epic'),
  ('kebal-cabaran',   'Kebal Cabaran',   'Challenge-Proof',   'Selesaikan 3 kuiz mod sukar berturut-turut tanpa gagal.',  'Complete 3 hard mode quizzes in a row.',           'kebal-cabaran.jpg',   7, 'epic'),
  ('mahir-sukar',     'Mahir Sukar',     'Hard Master',       'Skor 9/9 dalam mod sukar.',                                'Score 9/9 in hard mode.',                          'mahir-sukar.jpg',     8, 'legendary'),
  ('legenda-sukar',   'Legenda Sukar',   'Hard Legend',       'Selesaikan kesemua 15 kuiz mod sukar.',                    'Complete all 15 hard mode quizzes.',               'legenda-sukar.jpg',   9, 'legendary')
ON CONFLICT (id) DO NOTHING;

-- 2. Hard Mode Achievements — icons set to actual image filenames, sorted after existing achievements (1-11)
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

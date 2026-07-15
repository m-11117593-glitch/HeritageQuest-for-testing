-- Add is_hard_mode column to user_artifact_progress (idempotent)
DO $$ BEGIN
  ALTER TABLE public.user_artifact_progress ADD COLUMN is_hard_mode boolean DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Seed 5 hard mode badges and 9 hard mode achievements
-- Idempotent: skips entries whose id already exists

-- 1. Hard Mode Badges (sort_order 5-9)
INSERT INTO public.badges (id, name_bm, name_en, description_bm, description_en, icon, sort_order, rarity) VALUES
  ('pencabar-sukar',  'Pencabar Sukar',  'Hard Challenger',   'Selesaikan satu kuiz mod sukar.',                          'Complete one hard mode quiz.',                     '💀', 5, 'rare'),
  ('pemikir-tajam',   'Pemikir Tajam',   'Sharp Thinker',     'Skor 7/9 atau lebih dalam mod sukar.',                     'Score 7/9 or higher in hard mode.',                '🧠', 6, 'epic'),
  ('kebal-cabaran',   'Kebal Cabaran',   'Challenge-Proof',   'Selesaikan 3 kuiz mod sukar berturut-turut tanpa gagal.',  'Complete 3 hard mode quizzes in a row.',           '🛡️', 7, 'epic'),
  ('mahir-sukar',     'Mahir Sukar',     'Hard Master',       'Skor 9/9 dalam mod sukar.',                                'Score 9/9 in hard mode.',                          '⚡', 8, 'legendary'),
  ('legenda-sukar',   'Legenda Sukar',   'Hard Legend',       'Selesaikan kesemua 15 kuiz mod sukar.',                    'Complete all 15 hard mode quizzes.',               '🔥', 9, 'legendary')
ON CONFLICT (id) DO NOTHING;

-- 2. Hard Mode Achievements
INSERT INTO public.achievements (id, name_bm, name_en, description_bm, description_en, requirement_key, requirement_value) VALUES
  ('h-quiz-first',       'Langkah Pertama',    'First Step',          'Selesaikan kuiz pertama dalam mod sukar.',                'Complete your first hard mode quiz.',              'hard_quizzes',        1),
  ('h-quiz-five',        'Semakin Hebat',      'Getting Stronger',    'Selesaikan 5 kuiz mod sukar.',                            'Complete 5 hard mode quizzes.',                    'hard_quizzes',        5),
  ('h-quiz-all',         'Penakluk Sukar',     'Hard Conqueror',      'Selesaikan kesemua 15 kuiz mod sukar.',                   'Complete all 15 hard mode quizzes.',               'hard_quizzes',        15),
  ('h-perfect-one',      'Hampir Sempurna',    'Nearly Perfect',      'Skor 9/9 dalam satu kuiz mod sukar.',                     'Score 9/9 in one hard mode quiz.',                 'hard_perfect',        1),
  ('h-perfect-three',    'Tiga Sempurna',      'Triple Perfect',      'Skor 9/9 dalam 3 kuiz mod sukar.',                        'Score 9/9 in 3 hard mode quizzes.',                'hard_perfect',        3),
  ('h-streak-3',         'Rentak Sukar',       'Hard Streak',         'Dapatkan 3 jawapan betul berturut-turut dalam mod sukar.', 'Get 3 correct answers in a row in hard mode.',     'hard_streak',         3),
  ('h-streak-5',         'Rentak Kebal',       'Unbreakable Streak',  'Dapatkan 5 jawapan betul berturut-turut dalam mod sukar.', 'Get 5 correct answers in a row in hard mode.',     'hard_streak',         5),
  ('h-total-30',         'Pengumpul Mata',     'Point Collector',     'Kumpul 30 jawapan betul dalam mod sukar.',                'Collect 30 correct answers in hard mode.',         'hard_total_correct',  30),
  ('h-total-60',         'Sarjana Sukar',      'Hard Scholar',        'Kumpul 60 jawapan betul dalam mod sukar.',                'Collect 60 correct answers in hard mode.',         'hard_total_correct',  60)
ON CONFLICT (id) DO NOTHING;

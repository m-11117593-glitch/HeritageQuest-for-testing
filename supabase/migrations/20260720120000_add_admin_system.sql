-- Migration: Admin system — roles, extra images, quiz storage
-- Date: 2026-07-20

-- ============================================
-- 1. Add role column to profiles
-- ============================================
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

COMMENT ON COLUMN public.profiles.role IS 'User role: user (default) or admin (full CRUD access)';

-- Allow admins to see other profiles for management purposes
-- (only via service_role — normal RLS still restricts users to their own profile)

-- ============================================
-- 2. Add extra image columns to artifacts
-- ============================================
ALTER TABLE public.artifacts 
  ADD COLUMN IF NOT EXISTS image_url_2 TEXT,
  ADD COLUMN IF NOT EXISTS image_url_3 TEXT;

COMMENT ON COLUMN public.artifacts.image_url_2 IS 'Second artifact image URL (admin upload)';
COMMENT ON COLUMN public.artifacts.image_url_3 IS 'Third artifact image URL (admin upload)';

-- ============================================
-- 3. Create artifact_quiz_questions table
-- ============================================
-- Stores admin-created/persisted quiz questions per artifact.
-- If an artifact has questions here, the quiz UI uses these instead
-- of the legacy client-side generated questions.
CREATE TABLE IF NOT EXISTS public.artifact_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id TEXT NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  prompt_bm TEXT NOT NULL,
  prompt_en TEXT NOT NULL,
  options_bm JSONB NOT NULL,       -- ["option1", "option2", "option3", "option4"]
  options_en JSONB NOT NULL,
  correct_index INT NOT NULL CHECK (correct_index >= 0),
  difficulty INT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.artifact_quiz_questions IS 'Admin-created quiz questions for artifacts. Replaces legacy client-side generation when populated.';
COMMENT ON COLUMN public.artifact_quiz_questions.prompt_bm IS 'Question prompt in Bahasa Malaysia';
COMMENT ON COLUMN public.artifact_quiz_questions.prompt_en IS 'Question prompt in English';
COMMENT ON COLUMN public.artifact_quiz_questions.options_bm IS 'Array of 4 option strings in BM (correct answer at correct_index)';
COMMENT ON COLUMN public.artifact_quiz_questions.options_en IS 'Array of 4 option strings in EN (correct answer at correct_index)';
COMMENT ON COLUMN public.artifact_quiz_questions.correct_index IS 'Index (0-3) of the correct answer in options arrays';
COMMENT ON COLUMN public.artifact_quiz_questions.difficulty IS 'Difficulty tier 1 (easiest) to 5 (hardest)';

-- Index for fast lookups by artifact
CREATE INDEX IF NOT EXISTS idx_artifact_quiz_questions_artifact_id 
  ON public.artifact_quiz_questions(artifact_id);

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_artifact_quiz_questions_sort_order 
  ON public.artifact_quiz_questions(artifact_id, sort_order);

-- ============================================
-- 4. RLS & permissions for artifact_quiz_questions
-- ============================================
GRANT SELECT ON public.artifact_quiz_questions TO authenticated;
GRANT ALL ON public.artifact_quiz_questions TO service_role;

ALTER TABLE public.artifact_quiz_questions ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read (needed for regular users taking quizzes)
CREATE POLICY "quiz_questions_readable" 
  ON public.artifact_quiz_questions 
  FOR SELECT TO authenticated 
  USING (true);

-- Insert/update/delete are only done via supabaseAdmin (service_role),
-- which bypasses RLS entirely. No additional policies needed.

-- ============================================
-- 5. Create function to help promote a user to admin
-- ============================================
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

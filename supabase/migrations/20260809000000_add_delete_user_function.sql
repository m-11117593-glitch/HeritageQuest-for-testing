-- Self-service account deletion
-- Allows a signed-in user to permanently delete their own account.
-- Deleting the row in auth.users cascades to profiles, user_progress,
-- user_artifact_progress, user_badges, user_achievements, user_quests,
-- user_unique_quests, redemptions, leaderboard_seasons, etc.
-- (all reference auth.users(id) ON DELETE CASCADE).
--
-- Run via the Supabase SQL editor (or supabase db push).

CREATE OR REPLACE FUNCTION public.delete_user()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM auth.users WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.delete_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user() TO authenticated;

COMMENT ON FUNCTION public.delete_user IS
  'Deletes the currently signed-in user from auth.users, cascading to all their data.';

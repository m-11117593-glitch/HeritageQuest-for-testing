-- Allow authenticated users to read all profiles for the leaderboard
CREATE POLICY "read all profiles for leaderboard" ON public.profiles 
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to read all user_progress for the leaderboard
CREATE POLICY "read all progress for leaderboard" ON public.user_progress 
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to read all user_artifact_progress for the leaderboard
CREATE POLICY "read all scans for leaderboard" ON public.user_artifact_progress 
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to read all user_badges for the leaderboard
CREATE POLICY "read all badges for leaderboard" ON public.user_badges 
  FOR SELECT TO authenticated USING (true);

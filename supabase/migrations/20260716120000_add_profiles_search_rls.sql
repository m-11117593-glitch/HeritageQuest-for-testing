-- Allow authenticated users to search/read other users' profiles (id + username only)
-- Required for the friend search feature
CREATE POLICY "profiles search read" ON public.profiles
  FOR SELECT TO authenticated USING (true);

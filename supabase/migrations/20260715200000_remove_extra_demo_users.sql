-- Remove 15 extra demo users, keeping only the top 5 (Pengembara1, JelajahSetia, WarisanKu, BudayaAbadi, SejarahMuda)
-- This cleans up databases that were seeded with the original 20-user migration.

DO $$
DECLARE
  v_user_id UUID;
  usernames_to_keep TEXT[] := ARRAY['Pengembara1', 'JelajahSetia', 'WarisanKu', 'BudayaAbadi', 'SejarahMuda'];
  usernames_to_remove TEXT[] := ARRAY[
    'TanahAirKu', 'MelayuJati', 'BumiKenyalang', 'SultanMerah',
    'PahlawanEsa', 'SeriPantai', 'IntanBaik', 'WiraMalaya',
    'RimbaRaya', 'MutiaraTimur', 'CempakaSari', 'TerataiPagi',
    'PelangiSenja', 'BintangFajar', 'AnakMuda'
  ];
  u TEXT;
BEGIN

  -- Loop through each username to remove
  FOREACH u IN ARRAY usernames_to_remove
  LOOP
    -- Find the user ID from auth.users
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = LOWER(REPLACE(u, ' ', '')) || '@heritagequest.demo';

    IF NOT FOUND THEN
      RAISE NOTICE 'User % not found, skipping.', u;
      CONTINUE;
    END IF;

    RAISE NOTICE 'Removing demo user: % (ID: %)', u, v_user_id;

    -- Delete in order to respect foreign key constraints
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

  RAISE NOTICE 'Removed % extra demo users. Kept 5: %', array_length(usernames_to_remove, 1), array_to_string(usernames_to_keep, ', ');

END $$;

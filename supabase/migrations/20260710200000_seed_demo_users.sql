-- Seed 5 demo users for a lively leaderboard demo
-- Each user gets: auth.users entry, profile, progress, scanned artifacts, and badges
-- Password for all demo users: demo123
-- Idempotent: skips users whose email already exists

-- Enable pgcrypto for gen_salt / crypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Artifact IDs in sort_order (by category, 3 per category):
-- weapons: keris-panjang, meriam-melaka, terabai
-- regalia: tengkolok, baju-kurung-diraja, set-perak-diraja
-- music: gong-gamelan, rebana-ubi, seruling-tradisional
-- crafts: alat-tenun-songket, wau-bulan, canting-batik
-- toys: congkak, diabolo-cina, catur-cina

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

  -- Ensure core badges exist (needed for demo user badge assignments)
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

    -- Skip if this email already exists (idempotent)
    SELECT id INTO existing_id FROM auth.users WHERE email = demo_email;
    IF FOUND THEN
      CONTINUE;
    END IF;

    -- 1. Create auth user (pre-verified, password: demo123)
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

    -- Also insert the required identity record for email/password auth
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

    -- 2. The trigger auto-creates profile + default user_progress
    -- Update the auto-created user_progress with custom values
    UPDATE public.user_progress
    SET
      total_exp = demo.total_exp,
      current_level = demo.level,
      discount_points = (demo.level - 1) * 5,  -- POINTS_PER_LEVEL = 5
      updated_at = now()
    WHERE public.user_progress.user_id = v_user_id;

    -- 3. Insert scanned artifacts (first N by sort_order, newest scan last)
    IF demo.scan_count > 0 THEN
      scan_exp := 10;
      FOR i IN 1..demo.scan_count LOOP
        art_id := artifact_ids[i];
        INSERT INTO public.user_artifact_progress (user_id, artifact_id, exp_earned, scanned_at)
        VALUES (v_user_id, art_id, scan_exp, now() - (demo.scan_count - i) * INTERVAL '1 minute');
      END LOOP;
    END IF;

    -- 4. Award badges based on scan count and category completion
    badge_ids := '{}';

    -- First scan badge
    IF demo.scan_count >= 1 THEN
      badge_ids := array_append(badge_ids, 'penemu-pertama');
    END IF;

    -- Category quest badge (ahli-kuest): awarded when all 3 artifacts in any category are scanned
    -- Since artifacts scan in category order (3 per category), scan_count >= 3 means at least
    -- the 'weapons' category is complete.
    IF demo.scan_count >= 3 THEN
      badge_ids := array_append(badge_ids, 'ahli-kuest');
    END IF;

    -- Halfway badge
    IF demo.scan_count >= 8 THEN
      badge_ids := array_append(badge_ids, 'separuh-jalan');
    END IF;

    -- Full collection badge
    IF demo.scan_count = 15 THEN
      badge_ids := array_append(badge_ids, 'peneroka-muzium');
    END IF;

    FOREACH b_id IN ARRAY badge_ids
    LOOP
      INSERT INTO public.user_badges (user_id, badge_id, earned_at)
      VALUES (v_user_id, b_id, now() - INTERVAL '1 hour');
    END LOOP;

  END LOOP;

END $$;

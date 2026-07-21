-- Categories table for admin management
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name_bm TEXT NOT NULL,
  name_en TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📦',
  sort_order INT NOT NULL DEFAULT 0
);

GRANT SELECT ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories readable" ON public.categories FOR SELECT TO authenticated USING (true);

-- Seed default categories matching existing artifact categories
INSERT INTO public.categories (id, name_bm, name_en, icon, sort_order) VALUES
  ('weapons', 'Senjata Tradisional', 'Traditional Weapons', '🗡️', 1),
  ('regalia', 'Pakaian & Perhiasan Diraja', 'Royal Regalia', '👑', 2),
  ('music',   'Alat Muzik Tradisional', 'Traditional Music', '🎵', 3),
  ('crafts',  'Kraftangan Warisan', 'Heritage Crafts', '🧵', 4),
  ('toys',    'Mainan Tradisional', 'Traditional Toys', '🪀', 5)
ON CONFLICT (id) DO NOTHING;

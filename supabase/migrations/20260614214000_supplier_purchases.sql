CREATE TABLE IF NOT EXISTS public.supplier_purchases (
  id text PRIMARY KEY,
  farm_id uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
  supplier_name text NOT NULL,
  product_name text NOT NULL,
  purchase_date text NOT NULL,
  quantity double precision NOT NULL,
  unit text NOT NULL,
  price_per_unit double precision NOT NULL,
  total_cost double precision NOT NULL,
  paid_amount double precision NOT NULL,
  consumed double precision NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supplier_purchases ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Allow authenticated select" ON public.supplier_purchases;
CREATE POLICY "Allow authenticated select"
  ON public.supplier_purchases FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert" ON public.supplier_purchases;
CREATE POLICY "Allow authenticated insert"
  ON public.supplier_purchases FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update" ON public.supplier_purchases;
CREATE POLICY "Allow authenticated update"
  ON public.supplier_purchases FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete" ON public.supplier_purchases;
CREATE POLICY "Allow authenticated delete"
  ON public.supplier_purchases FOR DELETE TO authenticated
  USING (true);

-- Enable realtime
alter publication supabase_realtime add table public.supplier_purchases;

-- Trigger to touch updated_at
CREATE TRIGGER supplier_purchases_touch_updated_at
  BEFORE UPDATE ON public.supplier_purchases
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed data
INSERT INTO public.supplier_purchases (id, supplier_name, product_name, purchase_date, quantity, unit, price_per_unit, total_cost, paid_amount, consumed)
VALUES
  ('p-agrimax-1', 'Agrimax', 'Nitrate de Calcium / نترات كالسـيوم', '2026-03-01', 3000, 'kg', 160, 480000, 300000, 1200),
  ('p-agrimax-2', 'Agrimax', 'Acide Nitrique / حامض نيتريك', '2026-03-05', 1200, 'litres', 378.15, 453780, 453780, 450),
  ('p-agrimax-3', 'Agrimax', 'Oligo-éléments / عناصر صغري', '2026-03-10', 68, 'kg', 3450, 234600, 150000, 42),
  ('p-agrimax-4', 'Agrimax', 'Fer 6% / حديد 6%', '2026-03-12', 31, 'kg', 3200, 99200, 99200, 21),
  ('p-blida-1', 'BLIDA', 'Sulfate de Potassium / سلفات البوتاسيوم SOP', '2026-03-04', 1022, 'kg', 220, 225000, 180000, 600),
  ('p-hygindust-1', 'HYGINDUST', 'Acide Phosphorique / حامض فوسفوريك', '2026-03-08', 412, 'litres', 500, 206000, 206000, 180),
  ('p-rafik-1', 'Agro Rafik', 'Urée / يوريا', '2026-03-02', 4341, 'kg', 45, 195345, 150000, 1800),
  ('p-bahbah-1', 'Agro Bahbah', 'Sulfate de Magnésium / سلفات ماغنسيوم', '2026-03-14', 200, 'kg', 240, 480000, 40000, 80),
  ('p-nsda-1', 'NSDA', 'GZB Stimulateur de racines / منشط جذور', '2026-03-20', 10, 'litres', 2200, 22000, 22000, 6),
  ('p-kamel-1', 'Agro Kamel', 'Acide Humique / أسمدة عضوية', '2026-03-22', 42, 'litres', 420, 17640, 15000, 15)
ON CONFLICT (id) DO NOTHING;

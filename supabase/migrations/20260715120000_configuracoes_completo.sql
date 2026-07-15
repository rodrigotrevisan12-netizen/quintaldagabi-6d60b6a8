-- ============================================================================
-- Configurações — correções e campos novos
-- ============================================================================
-- 1) Identidade visual passa a viver 100% em `companies` (empresa), nunca
--    mais em `units` (filial) — corrige a violação do isolamento multiempresa.
-- 2) Novos campos em Unidade: email, horário de funcionamento.
-- 3) Novos campos em Serviços de banho & tosa: categoria, descrição, porte.
-- 4) Pacotes de creche passam a suportar dois modelos: semanal (já existia)
--    e avulso/crédito (novo, com quantidade de diárias + validade), mais
--    uma tabela para registrar cada compra de pacote avulso por cão.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Branding: mover para companies
-- ----------------------------------------------------------------------------
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS background_color text;

-- Se alguma unidade já tinha branding customizado (o admin usou a tela
-- antiga), leva essa personalização para a empresa correspondente antes de
-- desativarmos de vez a leitura em `units`.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT u.company_id, u.brand_name, u.brand_logo_url, u.brand_primary,
           u.brand_secondary, u.brand_accent, u.brand_background
    FROM public.units u
    WHERE u.company_id IS NOT NULL
      AND (u.brand_name IS NOT NULL OR u.brand_primary IS NOT NULL OR u.brand_logo_url IS NOT NULL)
    ORDER BY u.created_at
  LOOP
    UPDATE public.companies
    SET
      name = COALESCE(r.brand_name, name),
      logo_url = COALESCE(r.brand_logo_url, logo_url),
      primary_color = COALESCE(r.brand_primary, primary_color),
      secondary_color = COALESCE(r.brand_secondary, secondary_color),
      accent_color = COALESCE(r.brand_accent, accent_color),
      background_color = COALESCE(r.brand_background, background_color)
    WHERE id = r.company_id;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 2) Unidade: email + horário de funcionamento
-- ----------------------------------------------------------------------------
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS opening_hours text;

-- ----------------------------------------------------------------------------
-- 3) Serviços de banho & tosa: categoria, descrição, porte permitido
-- ----------------------------------------------------------------------------
ALTER TABLE public.grooming_services
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS sizes text[] NOT NULL DEFAULT ARRAY['pequeno','medio','grande'];

-- ----------------------------------------------------------------------------
-- 4) Pacotes de creche: dois modelos (semanal / avulso)
-- ----------------------------------------------------------------------------
ALTER TABLE public.daycare_packages
  DROP CONSTRAINT IF EXISTS daycare_packages_days_per_week_check;

ALTER TABLE public.daycare_packages
  ALTER COLUMN days_per_week DROP NOT NULL;

ALTER TABLE public.daycare_packages
  ADD COLUMN IF NOT EXISTS package_type text NOT NULL DEFAULT 'semanal',
  ADD COLUMN IF NOT EXISTS total_days integer,
  ADD COLUMN IF NOT EXISTS validity_days integer,
  ADD COLUMN IF NOT EXISTS description text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daycare_packages_type_check') THEN
    ALTER TABLE public.daycare_packages
      ADD CONSTRAINT daycare_packages_type_check CHECK (package_type IN ('semanal', 'avulso'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daycare_packages_days_per_week_range') THEN
    ALTER TABLE public.daycare_packages
      ADD CONSTRAINT daycare_packages_days_per_week_range CHECK (days_per_week IS NULL OR days_per_week BETWEEN 1 AND 7);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daycare_packages_consistency') THEN
    ALTER TABLE public.daycare_packages
      ADD CONSTRAINT daycare_packages_consistency CHECK (
        (package_type = 'semanal' AND days_per_week IS NOT NULL)
        OR
        (package_type = 'avulso' AND total_days IS NOT NULL AND validity_days IS NOT NULL)
      );
  END IF;
END $$;

COMMENT ON COLUMN public.daycare_packages.monthly_price IS
  'Valor do pacote. Para package_type=semanal: mensalidade. Para avulso: valor total do pacote de diárias.';

-- Cada compra de um pacote AVULSO por um cão específico (o pacote "semanal"
-- continua vinculado direto em dogs.daycare_package_id, sem mudança).
CREATE TABLE IF NOT EXISTS public.daycare_package_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.daycare_packages(id) ON DELETE RESTRICT,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  total_days INTEGER NOT NULL,
  days_used INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'completed', 'canceled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daycare_package_purchases TO authenticated;
GRANT ALL ON public.daycare_package_purchases TO service_role;
ALTER TABLE public.daycare_package_purchases ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_dpp_dog ON public.daycare_package_purchases(dog_id);
CREATE INDEX IF NOT EXISTS idx_dpp_status ON public.daycare_package_purchases(status);

CREATE POLICY "dpp staff manage" ON public.daycare_package_purchases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

CREATE POLICY "dpp tutor read own" ON public.daycare_package_purchases FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.dogs d JOIN public.tutors t ON t.id = d.tutor_id
    WHERE d.id = daycare_package_purchases.dog_id AND t.user_id = auth.uid()
  ));

-- Entra no mesmo mecanismo de isolamento multiempresa já em uso (Bloco B):
-- company_id preenchido sozinho + política restritiva por empresa.
ALTER TABLE public.daycare_package_purchases ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

DO $$
DECLARE
  v_default_company uuid;
BEGIN
  SELECT id INTO v_default_company FROM public.companies ORDER BY created_at LIMIT 1;
  UPDATE public.daycare_package_purchases SET company_id = v_default_company WHERE company_id IS NULL;
END $$;

ALTER TABLE public.daycare_package_purchases ALTER COLUMN company_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS daycare_package_purchases_company_id_idx ON public.daycare_package_purchases(company_id);

DROP TRIGGER IF EXISTS trg_set_company_id ON public.daycare_package_purchases;
CREATE TRIGGER trg_set_company_id BEFORE INSERT ON public.daycare_package_purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_caller();

DROP POLICY IF EXISTS tenant_isolation ON public.daycare_package_purchases;
CREATE POLICY tenant_isolation ON public.daycare_package_purchases AS RESTRICTIVE FOR ALL TO authenticated
  USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

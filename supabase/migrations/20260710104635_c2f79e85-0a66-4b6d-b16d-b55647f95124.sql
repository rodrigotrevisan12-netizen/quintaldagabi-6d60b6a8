
-- =========================================
-- BLOCO B — PARTE 1: Fundação multi-empresa
-- =========================================

-- 1) Tabela companies
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  subscription_status text NOT NULL DEFAULT 'trialing'
    CHECK (subscription_status IN ('trialing','active','past_due','canceled')),
  trial_expires_at timestamptz,
  plan text CHECK (plan IN ('mensal','trimestral','semestral','anual')),
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_companies_updated_at ON public.companies;
CREATE TRIGGER trg_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Empresa inicial "Quintal da Gabi" (active, sem trial)
INSERT INTO public.companies (id, name, subscription_status, plan)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Quintal da Gabi',
  'active',
  'anual'
)
ON CONFLICT (id) DO NOTHING;

-- 3) company_id em profiles e user_roles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE RESTRICT;

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE RESTRICT;

-- Backfill: todo mundo existente vira Quintal da Gabi
UPDATE public.profiles
   SET company_id = '00000000-0000-0000-0000-000000000001'::uuid
 WHERE company_id IS NULL;

UPDATE public.user_roles
   SET company_id = '00000000-0000-0000-0000-000000000001'::uuid
 WHERE company_id IS NULL;

-- Marca NOT NULL
ALTER TABLE public.profiles  ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.user_roles ALTER COLUMN company_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_company_id  ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_company_id ON public.user_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_stripe_customer ON public.companies(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_companies_stripe_subscription ON public.companies(stripe_subscription_id);

-- 4) Helper: current_company_id()
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper: is_company_admin() — admin da empresa atual
CREATE OR REPLACE FUNCTION public.is_company_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
      AND ur.company_id = p.company_id
  );
$$;

-- 5) RLS de companies
DROP POLICY IF EXISTS "company_members_can_view_own_company" ON public.companies;
CREATE POLICY "company_members_can_view_own_company"
ON public.companies FOR SELECT
TO authenticated
USING (id = public.current_company_id());

DROP POLICY IF EXISTS "company_admin_can_update_basic_fields" ON public.companies;
CREATE POLICY "company_admin_can_update_basic_fields"
ON public.companies FOR UPDATE
TO authenticated
USING (id = public.current_company_id() AND public.is_company_admin())
WITH CHECK (id = public.current_company_id() AND public.is_company_admin());

-- Nada de INSERT via app (feito só pelo signup server function com service_role)
-- Nada de DELETE

-- 6) Trigger: impedir alteração dos campos sensíveis (stripe/trial/status) via app
CREATE OR REPLACE FUNCTION public.protect_company_billing_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o call NÃO vier do service_role, bloqueia alteração dos campos sensíveis
  IF current_setting('request.jwt.claims', true)::jsonb->>'role' <> 'service_role' THEN
    IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
       OR NEW.trial_expires_at    IS DISTINCT FROM OLD.trial_expires_at
       OR NEW.plan                IS DISTINCT FROM OLD.plan
       OR NEW.stripe_customer_id  IS DISTINCT FROM OLD.stripe_customer_id
       OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
    THEN
      RAISE EXCEPTION 'Campos de cobrança só podem ser alterados pelo servidor';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_company_billing ON public.companies;
CREATE TRIGGER trg_protect_company_billing
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.protect_company_billing_fields();


-- 1) Colunas de cobrança agnósticas de gateway
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS billing_provider text,             -- 'paddle' | 'stripe' | ...
  ADD COLUMN IF NOT EXISTS billing_customer_id text,
  ADD COLUMN IF NOT EXISTS billing_subscription_id text,
  ADD COLUMN IF NOT EXISTS billing_price_id text,             -- external_id humano (ex: 'central_pet_monthly')
  ADD COLUMN IF NOT EXISTS billing_environment text,          -- 'sandbox' | 'live'
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

-- Índice para lookup por subscription id no webhook
CREATE UNIQUE INDEX IF NOT EXISTS companies_billing_subscription_id_key
  ON public.companies (billing_subscription_id)
  WHERE billing_subscription_id IS NOT NULL;

-- 2) Função: a empresa tem acesso ao sistema agora?
CREATE OR REPLACE FUNCTION public.company_has_access(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = _company_id
      AND (
        (c.subscription_status = 'trialing'
          AND c.trial_expires_at IS NOT NULL
          AND c.trial_expires_at > now())
        OR c.subscription_status IN ('active','past_due')
        OR (c.subscription_status = 'canceled'
            AND c.current_period_end IS NOT NULL
            AND c.current_period_end > now())
      )
  );
$$;

-- 3) Função utilitária: acesso do usuário logado
CREATE OR REPLACE FUNCTION public.current_user_has_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.company_has_access(public.current_company_id());
$$;

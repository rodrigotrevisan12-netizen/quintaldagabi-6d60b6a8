-- ============================================================================
-- Correção: contas sem company_id vinculado
-- ============================================================================
-- Ao longo das migrações de multiempresa, alguns perfis podem ter ficado
-- sem `company_id` (por exemplo, se o cadastro do usuário aconteceu num
-- momento entre duas migrações). Sem isso, a tela de Identidade Visual
-- (e outras) não consegue saber a qual empresa aplicar as configurações,
-- e fica presa em "Carregando…".
--
-- Esta migração vincula qualquer perfil/papel órfão à empresa mais antiga
-- cadastrada (que, hoje, é sempre "Quintal da Gabi" — o histórico original).
-- ============================================================================

DO $$
DECLARE
  v_default_company uuid;
  v_fixed_profiles int;
  v_fixed_roles int;
BEGIN
  SELECT id INTO v_default_company FROM public.companies ORDER BY created_at LIMIT 1;

  IF v_default_company IS NULL THEN
    RAISE NOTICE 'Nenhuma empresa cadastrada ainda — nada a corrigir.';
    RETURN;
  END IF;

  UPDATE public.profiles SET company_id = v_default_company WHERE company_id IS NULL;
  GET DIAGNOSTICS v_fixed_profiles = ROW_COUNT;

  UPDATE public.user_roles SET company_id = v_default_company WHERE company_id IS NULL;
  GET DIAGNOSTICS v_fixed_roles = ROW_COUNT;

  RAISE NOTICE 'Perfis corrigidos: %, papéis corrigidos: %', v_fixed_profiles, v_fixed_roles;
END $$;

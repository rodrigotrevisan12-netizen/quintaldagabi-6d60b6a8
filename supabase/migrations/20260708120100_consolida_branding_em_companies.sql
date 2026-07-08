-- ============================================================================
-- Consolidação do branding: antes dessa migração, a identidade visual
-- (nome/logo/cores) estava salva em `units` (uma linha por filial). Com o
-- modelo multiempresa, o branding passa a ser por EMPRESA (`companies`),
-- não por filial — senão duas filiais da mesma empresa poderiam, por engano,
-- ficar com "marcas" diferentes.
--
-- Esta migração copia qualquer personalização já feita em `units` para a
-- empresa padrão (a mesma que recebeu todo o histórico na Fase 1), e então
-- deixa as colunas antigas em `units` como legado (não usadas mais pelo
-- frontend, mas preservadas — nada é apagado).
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  SELECT brand_name, brand_logo_url, brand_primary, brand_secondary, brand_accent
    INTO r
    FROM public.units
    WHERE brand_name IS NOT NULL OR brand_logo_url IS NOT NULL OR brand_primary IS NOT NULL
    ORDER BY created_at
    LIMIT 1;

  IF FOUND THEN
    UPDATE public.companies
    SET
      name = COALESCE(r.brand_name, name),
      logo_url = COALESCE(r.brand_logo_url, logo_url),
      primary_color = COALESCE(r.brand_primary, primary_color),
      secondary_color = COALESCE(r.brand_secondary, secondary_color),
      accent_color = COALESCE(r.brand_accent, accent_color)
    WHERE id = '00000000-0000-0000-0000-000000000001';
  END IF;
END $$;

COMMENT ON COLUMN public.units.brand_name IS
  'Legado — não usar. O branding agora fica em public.companies (uma marca por empresa, não por filial).';
COMMENT ON COLUMN public.units.brand_logo_url IS 'Legado — ver public.companies.';
COMMENT ON COLUMN public.units.brand_primary IS 'Legado — ver public.companies.';
COMMENT ON COLUMN public.units.brand_secondary IS 'Legado — ver public.companies.';
COMMENT ON COLUMN public.units.brand_accent IS 'Legado — ver public.companies.';

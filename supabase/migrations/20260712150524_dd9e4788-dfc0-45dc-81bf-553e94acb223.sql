
-- Atualiza handle_new_user para respeitar company_id vinda dos metadados
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  default_unit UUID;
  meta_company UUID;
  fallback_company UUID;
  final_company UUID;
BEGIN
  SELECT id INTO default_unit FROM public.units WHERE is_active = true ORDER BY created_at LIMIT 1;

  BEGIN
    meta_company := NULLIF(NEW.raw_user_meta_data->>'company_id','')::uuid;
  EXCEPTION WHEN others THEN
    meta_company := NULL;
  END;

  IF meta_company IS NOT NULL AND EXISTS (SELECT 1 FROM public.companies WHERE id = meta_company) THEN
    final_company := meta_company;
  ELSE
    SELECT id INTO fallback_company FROM public.companies ORDER BY created_at LIMIT 1;
    final_company := fallback_company;
  END IF;

  INSERT INTO public.profiles (id, full_name, default_unit_id, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    default_unit,
    final_company
  )
  ON CONFLICT (id) DO NOTHING;

  IF NEW.email = 'gabrielamarquezinpirana@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role, unit_id, company_id)
    VALUES (NEW.id, 'admin', default_unit, final_company)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Policy para permitir que usuários autenticados criem uma nova empresa (usado pelo cadastro público após criar a conta).
DROP POLICY IF EXISTS "Authenticated can create own company" ON public.companies;
CREATE POLICY "Authenticated can create own company"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (true);

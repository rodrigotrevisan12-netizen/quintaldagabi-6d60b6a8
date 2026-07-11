
-- 1) Revoke anon EXECUTE on SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_company_admin() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_company_billing_fields() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_company_admin() TO authenticated, service_role;
-- protect_company_billing_fields is a trigger fn; only needs service_role
GRANT EXECUTE ON FUNCTION public.protect_company_billing_fields() TO service_role;

-- 2) Scope has_role() to the caller's own company.
-- A role row only counts when its company_id matches the caller's profile company_id
-- (or when the role row has no company_id, for legacy rows).
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND (
        ur.company_id IS NULL
        OR ur.company_id = p.company_id
      )
  );
$function$;

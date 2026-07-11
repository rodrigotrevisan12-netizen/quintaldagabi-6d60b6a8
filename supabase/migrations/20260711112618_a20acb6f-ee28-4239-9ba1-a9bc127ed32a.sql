REVOKE EXECUTE ON FUNCTION public.set_company_id_from_caller() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_company_id_from_caller() TO authenticated, service_role;
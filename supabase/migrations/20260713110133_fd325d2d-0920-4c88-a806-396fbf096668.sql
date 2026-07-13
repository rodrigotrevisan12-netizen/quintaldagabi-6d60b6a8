
REVOKE ALL ON FUNCTION public.company_has_access(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_has_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.company_has_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_has_access() TO authenticated, service_role;

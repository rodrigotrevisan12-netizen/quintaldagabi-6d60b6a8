
ALTER VIEW public.v_tutor_balances SET (security_invoker = true);

REVOKE EXECUTE ON FUNCTION public.upsert_service_charge(text, uuid, uuid, uuid, fin_revenue_category, text, numeric, date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_grooming_charge() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_boarding_charge() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_daycare_charge() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tutor_of_dog(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.default_unit_id() FROM PUBLIC, anon, authenticated;

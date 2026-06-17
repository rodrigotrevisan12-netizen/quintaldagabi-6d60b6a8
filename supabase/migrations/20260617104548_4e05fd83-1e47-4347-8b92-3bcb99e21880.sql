
DROP POLICY IF EXISTS "dogs read auth" ON storage.objects;
CREATE POLICY "dogs read staff" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'dogs' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario')));

DROP POLICY IF EXISTS "grooming read auth" ON storage.objects;
CREATE POLICY "grooming read staff" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'grooming' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario')));

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

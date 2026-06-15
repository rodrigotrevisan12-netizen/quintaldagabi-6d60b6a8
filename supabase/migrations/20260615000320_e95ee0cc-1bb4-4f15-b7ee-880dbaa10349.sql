
CREATE POLICY "dogs read auth" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='dogs');
CREATE POLICY "dogs staff insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='dogs' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario')));
CREATE POLICY "dogs staff update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='dogs' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario')));
CREATE POLICY "dogs staff delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='dogs' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario')));

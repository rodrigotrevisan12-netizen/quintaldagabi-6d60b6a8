
CREATE POLICY "stories staff write" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'stories' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario')))
  WITH CHECK (bucket_id = 'stories' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario')));

CREATE POLICY "stories tutor read own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'stories'
    AND EXISTS (
      SELECT 1 FROM public.dogs d
      JOIN public.tutors t ON t.id = d.tutor_id
      WHERE t.user_id = auth.uid()
        AND d.id::text = (storage.foldername(name))[1]
    )
  );


CREATE POLICY "documents bucket staff all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documents' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario')))
  WITH CHECK (bucket_id = 'documents' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario')));

CREATE POLICY "documents bucket tutor read own" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.tutors t ON t.id = d.tutor_id
      WHERE t.user_id = auth.uid()
        AND d.pdf_path = storage.objects.name
    )
  );

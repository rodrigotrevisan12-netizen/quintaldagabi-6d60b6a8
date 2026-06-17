
CREATE POLICY "reports bucket staff all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'reports' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario')))
  WITH CHECK (bucket_id = 'reports' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario')));

CREATE POLICY "reports bucket tutor read own" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'reports'
    AND EXISTS (
      SELECT 1 FROM public.daily_report_media m
      JOIN public.daily_reports r ON r.id = m.report_id
      JOIN public.dogs d ON d.id = r.dog_id
      JOIN public.tutors t ON t.id = d.tutor_id
      WHERE m.media_url = storage.objects.name
        AND r.published = true
        AND t.user_id = auth.uid()
    )
  );

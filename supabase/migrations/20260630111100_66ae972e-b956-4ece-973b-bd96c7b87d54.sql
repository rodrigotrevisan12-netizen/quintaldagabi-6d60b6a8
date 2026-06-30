DROP POLICY IF EXISTS "stories tutor read own" ON storage.objects;
CREATE POLICY "stories tutor read own" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'stories'
  AND EXISTS (
    SELECT 1 FROM public.dogs d
    JOIN public.tutors t ON t.id = d.tutor_id
    WHERE t.user_id = auth.uid()
      AND d.id::text = (storage.foldername(storage.objects.name))[1]
  )
);
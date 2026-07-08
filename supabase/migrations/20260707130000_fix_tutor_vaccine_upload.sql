-- ============================================================================
-- CORREÇÃO: upload de fotos pelo tutor (carteira de vacina, etc.) bloqueado
-- ============================================================================
-- Bug: as políticas de storage.objects para o bucket "dogs" comparavam a
-- pasta do arquivo com `d.name` (nome do CÃO, ex. "Rex") em vez de
-- `objects.name` (o caminho do ARQUIVO, ex. "<dog_id>/vaccine-123.png").
-- Resultado: a condição nunca era verdadeira e todo upload de tutor era
-- rejeitado com "new row violates row-level security policy".

DROP POLICY IF EXISTS "dogs tutor insert own folder" ON storage.objects;
CREATE POLICY "dogs tutor insert own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dogs'
  AND EXISTS (
    SELECT 1 FROM public.dogs d
    JOIN public.tutors t ON t.id = d.tutor_id
    WHERE t.user_id = auth.uid()
      AND (d.id)::text = (storage.foldername(objects.name))[1]
  )
);

DROP POLICY IF EXISTS "dogs tutor read own folder" ON storage.objects;
CREATE POLICY "dogs tutor read own folder"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'dogs'
  AND EXISTS (
    SELECT 1 FROM public.dogs d
    JOIN public.tutors t ON t.id = d.tutor_id
    WHERE t.user_id = auth.uid()
      AND (d.id)::text = (storage.foldername(objects.name))[1]
  )
);

DROP POLICY IF EXISTS "dogs tutor update own folder" ON storage.objects;
CREATE POLICY "dogs tutor update own folder"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'dogs'
  AND EXISTS (
    SELECT 1 FROM public.dogs d
    JOIN public.tutors t ON t.id = d.tutor_id
    WHERE t.user_id = auth.uid()
      AND (d.id)::text = (storage.foldername(objects.name))[1]
  )
);

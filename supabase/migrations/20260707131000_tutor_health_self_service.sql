-- ============================================================================
-- Tutor: passa a poder CADASTRAR (não editar/excluir — isso é exclusivo do
-- admin, ver próxima migração) antipulgas, medicamentos, alergias e
-- restrições alimentares do(s) próprio(s) cão(ães). Antes, só podia ler.
-- ============================================================================

CREATE POLICY "tutor insert flea" ON public.dog_flea_treatments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.dogs d JOIN public.tutors t ON t.id = d.tutor_id
    WHERE d.id = dog_flea_treatments.dog_id AND t.user_id = auth.uid()
  ));

CREATE POLICY "tutor insert meds" ON public.dog_medications
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.dogs d JOIN public.tutors t ON t.id = d.tutor_id
    WHERE d.id = dog_medications.dog_id AND t.user_id = auth.uid()
  ));

CREATE POLICY "tutor insert allergies" ON public.dog_allergies
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.dogs d JOIN public.tutors t ON t.id = d.tutor_id
    WHERE d.id = dog_allergies.dog_id AND t.user_id = auth.uid()
  ));

CREATE POLICY "tutor insert diet" ON public.dog_diet_restrictions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.dogs d JOIN public.tutors t ON t.id = d.tutor_id
    WHERE d.id = dog_diet_restrictions.dog_id AND t.user_id = auth.uid()
  ));


-- Permitir tutor cadastrar antipulgas, medicamentos, alergias e restrições dos próprios cães
CREATE POLICY "tutor manage own flea" ON public.dog_flea_treatments FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM dogs d JOIN tutors t ON t.id=d.tutor_id WHERE d.id=dog_flea_treatments.dog_id AND t.user_id=auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM dogs d JOIN tutors t ON t.id=d.tutor_id WHERE d.id=dog_flea_treatments.dog_id AND t.user_id=auth.uid()));

CREATE POLICY "tutor manage own meds" ON public.dog_medications FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM dogs d JOIN tutors t ON t.id=d.tutor_id WHERE d.id=dog_medications.dog_id AND t.user_id=auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM dogs d JOIN tutors t ON t.id=d.tutor_id WHERE d.id=dog_medications.dog_id AND t.user_id=auth.uid()));

CREATE POLICY "tutor manage own allergies" ON public.dog_allergies FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM dogs d JOIN tutors t ON t.id=d.tutor_id WHERE d.id=dog_allergies.dog_id AND t.user_id=auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM dogs d JOIN tutors t ON t.id=d.tutor_id WHERE d.id=dog_allergies.dog_id AND t.user_id=auth.uid()));

CREATE POLICY "tutor manage own diet" ON public.dog_diet_restrictions FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM dogs d JOIN tutors t ON t.id=d.tutor_id WHERE d.id=dog_diet_restrictions.dog_id AND t.user_id=auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM dogs d JOIN tutors t ON t.id=d.tutor_id WHERE d.id=dog_diet_restrictions.dog_id AND t.user_id=auth.uid()));

-- Remover a unidade desativada de Itupeva
DELETE FROM public.units WHERE id = '3856ea85-75c2-4ef5-8e7a-5ccbe97df03a';

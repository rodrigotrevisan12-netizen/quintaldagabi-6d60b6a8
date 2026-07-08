DROP POLICY "gas tutor insert own" ON public.grooming_appointment_services;
CREATE POLICY "gas tutor insert own" ON public.grooming_appointment_services
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM grooming_appointments a
    JOIN dogs d ON d.id = a.dog_id
    JOIN tutors t ON t.id = d.tutor_id
    WHERE a.id = grooming_appointment_services.appointment_id
      AND t.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM grooming_services s
    WHERE s.id = grooming_appointment_services.service_id
      AND s.is_active = true
      AND s.base_price = grooming_appointment_services.price
  )
);
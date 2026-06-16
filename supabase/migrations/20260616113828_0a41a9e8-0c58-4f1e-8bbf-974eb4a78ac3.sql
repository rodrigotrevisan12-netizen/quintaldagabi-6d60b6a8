
CREATE TYPE public.grooming_status AS ENUM ('scheduled','in_progress','done','cancelled','no_show');
CREATE TYPE public.grooming_photo_moment AS ENUM ('before','after');

-- ============ grooming_services ============
CREATE TABLE public.grooming_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  duration_min INTEGER NOT NULL DEFAULT 60,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grooming_services TO authenticated;
GRANT ALL ON public.grooming_services TO service_role;
ALTER TABLE public.grooming_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gs read auth" ON public.grooming_services FOR SELECT TO authenticated USING (true);
CREATE POLICY "gs write admin" ON public.grooming_services FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_gs_upd BEFORE UPDATE ON public.grooming_services FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.grooming_services (name, duration_min, base_price) VALUES
  ('Banho', 60, 50),
  ('Tosa completa', 90, 90),
  ('Tosa higiênica', 45, 40),
  ('Corte de unhas', 15, 20),
  ('Escovação', 30, 30)
ON CONFLICT (name) DO NOTHING;

-- ============ grooming_appointments ============
CREATE TABLE public.grooming_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 60,
  groomer_id UUID REFERENCES public.profiles(id),
  status public.grooming_status NOT NULL DEFAULT 'scheduled',
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  total_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grooming_appointments TO authenticated;
GRANT ALL ON public.grooming_appointments TO service_role;
ALTER TABLE public.grooming_appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ga staff all" ON public.grooming_appointments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "ga tutor read own" ON public.grooming_appointments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dogs d JOIN public.tutors t ON t.id=d.tutor_id WHERE d.id=grooming_appointments.dog_id AND t.user_id=auth.uid()));
CREATE INDEX idx_ga_dog ON public.grooming_appointments(dog_id);
CREATE INDEX idx_ga_scheduled ON public.grooming_appointments(scheduled_at);
CREATE INDEX idx_ga_groomer ON public.grooming_appointments(groomer_id);
CREATE TRIGGER trg_ga_upd BEFORE UPDATE ON public.grooming_appointments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ grooming_appointment_services ============
CREATE TABLE public.grooming_appointment_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.grooming_appointments(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.grooming_services(id),
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grooming_appointment_services TO authenticated;
GRANT ALL ON public.grooming_appointment_services TO service_role;
ALTER TABLE public.grooming_appointment_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gas staff all" ON public.grooming_appointment_services FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "gas tutor read own" ON public.grooming_appointment_services FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.grooming_appointments a JOIN public.dogs d ON d.id=a.dog_id JOIN public.tutors t ON t.id=d.tutor_id WHERE a.id=grooming_appointment_services.appointment_id AND t.user_id=auth.uid()));
CREATE INDEX idx_gas_app ON public.grooming_appointment_services(appointment_id);

-- ============ grooming_photos ============
CREATE TABLE public.grooming_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL REFERENCES public.grooming_appointments(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  moment public.grooming_photo_moment NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grooming_photos TO authenticated;
GRANT ALL ON public.grooming_photos TO service_role;
ALTER TABLE public.grooming_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gp staff all" ON public.grooming_photos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "gp tutor read own" ON public.grooming_photos FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.grooming_appointments a JOIN public.dogs d ON d.id=a.dog_id JOIN public.tutors t ON t.id=d.tutor_id WHERE a.id=grooming_photos.appointment_id AND t.user_id=auth.uid()));
CREATE INDEX idx_gp_app ON public.grooming_photos(appointment_id);

-- ============ storage policies for grooming bucket ============
CREATE POLICY "grooming insert staff" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='grooming' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario')));
CREATE POLICY "grooming update staff" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id='grooming' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario')));
CREATE POLICY "grooming delete staff" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='grooming' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario')));
CREATE POLICY "grooming read auth" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='grooming');

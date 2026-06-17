
CREATE TYPE public.report_entry_type AS ENUM (
  'alimentacao', 'hidratacao', 'brincadeira', 'passeio', 'descanso', 'comportamento'
);

CREATE TYPE public.report_media_type AS ENUM ('photo', 'video');

CREATE TABLE public.daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  stay_type TEXT,
  stay_id UUID,
  author_id UUID REFERENCES auth.users(id),
  summary TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX dr_dog_date_idx ON public.daily_reports(dog_id, date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_reports TO authenticated;
GRANT ALL ON public.daily_reports TO service_role;

ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dr staff all" ON public.daily_reports FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

CREATE POLICY "dr tutor read published" ON public.daily_reports FOR SELECT TO authenticated
  USING (published = true AND EXISTS (
    SELECT 1 FROM public.dogs d JOIN public.tutors t ON t.id = d.tutor_id
    WHERE d.id = daily_reports.dog_id AND t.user_id = auth.uid()
  ));

CREATE TRIGGER dr_updated BEFORE UPDATE ON public.daily_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.daily_report_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  entry_type public.report_entry_type NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  description TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_report_entries TO authenticated;
GRANT ALL ON public.daily_report_entries TO service_role;

ALTER TABLE public.daily_report_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dre staff all" ON public.daily_report_entries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

CREATE POLICY "dre tutor read published" ON public.daily_report_entries FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.daily_reports r
    JOIN public.dogs d ON d.id = r.dog_id
    JOIN public.tutors t ON t.id = d.tutor_id
    WHERE r.id = daily_report_entries.report_id AND r.published = true AND t.user_id = auth.uid()
  ));

CREATE TABLE public.daily_report_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type public.report_media_type NOT NULL DEFAULT 'photo',
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_report_media TO authenticated;
GRANT ALL ON public.daily_report_media TO service_role;

ALTER TABLE public.daily_report_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "drm staff all" ON public.daily_report_media FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

CREATE POLICY "drm tutor read published" ON public.daily_report_media FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.daily_reports r
    JOIN public.dogs d ON d.id = r.dog_id
    JOIN public.tutors t ON t.id = d.tutor_id
    WHERE r.id = daily_report_media.report_id AND r.published = true AND t.user_id = auth.uid()
  ));

CREATE OR REPLACE VIEW public.dog_timeline_events
WITH (security_invoker = true) AS
  SELECT dog_id, 'daycare_stay'::text AS event_type, check_in_at AS event_at,
         'Creche'::text AS summary,
         jsonb_build_object('stay_id', id, 'check_out_at', check_out_at) AS payload
  FROM public.daycare_stays
  UNION ALL
  SELECT dog_id, 'boarding_stay', check_in_at, 'Hospedagem',
         jsonb_build_object('stay_id', id, 'expected_check_out_at', expected_check_out_at, 'check_out_at', check_out_at)
  FROM public.boarding_stays
  UNION ALL
  SELECT dog_id, 'grooming', scheduled_at, 'Banho & Tosa',
         jsonb_build_object('appointment_id', id, 'status', status)
  FROM public.grooming_appointments
  UNION ALL
  SELECT dog_id, 'daily_report', (date::timestamptz),
         COALESCE(summary, 'Boletim do dia'),
         jsonb_build_object('report_id', id)
  FROM public.daily_reports WHERE published = true
  UNION ALL
  SELECT dog_id, 'vaccine', COALESCE(applied_date::timestamptz, created_at),
         'Vacina: ' || vaccine_type,
         jsonb_build_object('id', id, 'next_due_date', next_due_date)
  FROM public.dog_vaccines
  UNION ALL
  SELECT dog_id, 'deworming', COALESCE(applied_date::timestamptz, created_at),
         'Vermífugo: ' || COALESCE(product,''),
         jsonb_build_object('id', id)
  FROM public.dog_dewormings
  UNION ALL
  SELECT dog_id, 'flea', COALESCE(applied_date::timestamptz, created_at),
         'Antipulgas: ' || COALESCE(product,''),
         jsonb_build_object('id', id)
  FROM public.dog_flea_treatments
  UNION ALL
  SELECT dog_id, 'medical', COALESCE(event_date::timestamptz, created_at),
         COALESCE(description, 'Evento médico'),
         jsonb_build_object('id', id)
  FROM public.dog_medical_history
  UNION ALL
  SELECT dog_id, 'behavior', COALESCE(event_date::timestamptz, created_at),
         'Histórico comportamental',
         jsonb_build_object('id', id)
  FROM public.dog_behavior_history
  UNION ALL
  SELECT dog_id, 'document', signed_at,
         'Documento assinado: ' || title,
         jsonb_build_object('document_id', id, 'type', type)
  FROM public.documents WHERE signed_at IS NOT NULL;

GRANT SELECT ON public.dog_timeline_events TO authenticated;

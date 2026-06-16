
-- Enums
CREATE TYPE public.daycare_feeding_type AS ENUM ('racao', 'petisco', 'umida', 'agua', 'outra');
CREATE TYPE public.daycare_activity_type AS ENUM ('passeio', 'brincadeira', 'soneca', 'socializacao', 'treino', 'outra');

-- ============ unit_settings ============
CREATE TABLE public.unit_settings (
  unit_id UUID NOT NULL PRIMARY KEY REFERENCES public.units(id) ON DELETE CASCADE,
  daycare_capacity INTEGER NOT NULL DEFAULT 20,
  boarding_capacity INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.unit_settings TO authenticated;
GRANT ALL ON public.unit_settings TO service_role;

ALTER TABLE public.unit_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "unit_settings read auth" ON public.unit_settings FOR SELECT TO authenticated
  USING (true);
CREATE POLICY "unit_settings write admin" ON public.unit_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_unit_settings_updated_at BEFORE UPDATE ON public.unit_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed para unidade existente
INSERT INTO public.unit_settings (unit_id, daycare_capacity, boarding_capacity)
SELECT id, 20, 10 FROM public.units
ON CONFLICT (unit_id) DO NOTHING;

-- ============ daycare_stays ============
CREATE TABLE public.daycare_stays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id),
  check_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_out_at TIMESTAMPTZ,
  check_in_by UUID REFERENCES auth.users(id),
  check_out_by UUID REFERENCES auth.users(id),
  drop_off_person TEXT,
  pickup_person TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daycare_stays TO authenticated;
GRANT ALL ON public.daycare_stays TO service_role;

ALTER TABLE public.daycare_stays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daycare_stays staff all" ON public.daycare_stays FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "daycare_stays tutor read own" ON public.daycare_stays FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dogs d JOIN public.tutors t ON t.id=d.tutor_id WHERE d.id=daycare_stays.dog_id AND t.user_id=auth.uid()));

CREATE INDEX idx_daycare_stays_dog ON public.daycare_stays(dog_id);
CREATE INDEX idx_daycare_stays_open ON public.daycare_stays(check_out_at) WHERE check_out_at IS NULL;
CREATE INDEX idx_daycare_stays_checkin ON public.daycare_stays(check_in_at DESC);

-- Apenas uma estadia aberta por cão
CREATE UNIQUE INDEX uniq_daycare_stay_open ON public.daycare_stays(dog_id) WHERE check_out_at IS NULL;

CREATE TRIGGER trg_daycare_stays_updated_at BEFORE UPDATE ON public.daycare_stays
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ daycare_feedings ============
CREATE TABLE public.daycare_feedings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stay_id UUID NOT NULL REFERENCES public.daycare_stays(id) ON DELETE CASCADE,
  fed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  feeding_type public.daycare_feeding_type NOT NULL,
  amount TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daycare_feedings TO authenticated;
GRANT ALL ON public.daycare_feedings TO service_role;

ALTER TABLE public.daycare_feedings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daycare_feedings staff all" ON public.daycare_feedings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "daycare_feedings tutor read own" ON public.daycare_feedings FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.daycare_stays s
    JOIN public.dogs d ON d.id=s.dog_id
    JOIN public.tutors t ON t.id=d.tutor_id
    WHERE s.id=daycare_feedings.stay_id AND t.user_id=auth.uid()
  ));

CREATE INDEX idx_daycare_feedings_stay ON public.daycare_feedings(stay_id);

-- ============ daycare_medications ============
CREATE TABLE public.daycare_medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stay_id UUID NOT NULL REFERENCES public.daycare_stays(id) ON DELETE CASCADE,
  given_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  medication TEXT NOT NULL,
  dose TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daycare_medications TO authenticated;
GRANT ALL ON public.daycare_medications TO service_role;

ALTER TABLE public.daycare_medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daycare_meds staff all" ON public.daycare_medications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "daycare_meds tutor read own" ON public.daycare_medications FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.daycare_stays s
    JOIN public.dogs d ON d.id=s.dog_id
    JOIN public.tutors t ON t.id=d.tutor_id
    WHERE s.id=daycare_medications.stay_id AND t.user_id=auth.uid()
  ));

CREATE INDEX idx_daycare_meds_stay ON public.daycare_medications(stay_id);

-- ============ daycare_activities ============
CREATE TABLE public.daycare_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stay_id UUID NOT NULL REFERENCES public.daycare_stays(id) ON DELETE CASCADE,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  activity_type public.daycare_activity_type NOT NULL,
  duration_min INTEGER,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daycare_activities TO authenticated;
GRANT ALL ON public.daycare_activities TO service_role;

ALTER TABLE public.daycare_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daycare_acts staff all" ON public.daycare_activities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "daycare_acts tutor read own" ON public.daycare_activities FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.daycare_stays s
    JOIN public.dogs d ON d.id=s.dog_id
    JOIN public.tutors t ON t.id=d.tutor_id
    WHERE s.id=daycare_activities.stay_id AND t.user_id=auth.uid()
  ));

CREATE INDEX idx_daycare_acts_stay ON public.daycare_activities(stay_id);

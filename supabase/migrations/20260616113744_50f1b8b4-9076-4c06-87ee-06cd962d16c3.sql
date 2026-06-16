
-- ============ boarding_stays ============
CREATE TABLE public.boarding_stays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id),
  check_in_at TIMESTAMPTZ NOT NULL,
  expected_check_out_at TIMESTAMPTZ NOT NULL,
  check_out_at TIMESTAMPTZ,
  kennel TEXT,
  daily_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes TEXT,
  check_in_by UUID REFERENCES auth.users(id),
  check_out_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.boarding_stays TO authenticated;
GRANT ALL ON public.boarding_stays TO service_role;

ALTER TABLE public.boarding_stays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boarding_stays staff all" ON public.boarding_stays FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "boarding_stays tutor read own" ON public.boarding_stays FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.dogs d JOIN public.tutors t ON t.id=d.tutor_id WHERE d.id=boarding_stays.dog_id AND t.user_id=auth.uid()));

CREATE INDEX idx_boarding_stays_dog ON public.boarding_stays(dog_id);
CREATE INDEX idx_boarding_stays_open ON public.boarding_stays(check_out_at) WHERE check_out_at IS NULL;
CREATE INDEX idx_boarding_stays_dates ON public.boarding_stays(check_in_at, expected_check_out_at);

CREATE TRIGGER trg_boarding_stays_updated_at BEFORE UPDATE ON public.boarding_stays
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ boarding_belongings ============
CREATE TABLE public.boarding_belongings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stay_id UUID NOT NULL REFERENCES public.boarding_stays(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  returned BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.boarding_belongings TO authenticated;
GRANT ALL ON public.boarding_belongings TO service_role;
ALTER TABLE public.boarding_belongings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boarding_bel staff all" ON public.boarding_belongings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "boarding_bel tutor read own" ON public.boarding_belongings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.boarding_stays s JOIN public.dogs d ON d.id=s.dog_id JOIN public.tutors t ON t.id=d.tutor_id WHERE s.id=boarding_belongings.stay_id AND t.user_id=auth.uid()));

CREATE INDEX idx_bel_stay ON public.boarding_belongings(stay_id);

-- ============ boarding_food ============
CREATE TABLE public.boarding_food (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stay_id UUID NOT NULL REFERENCES public.boarding_stays(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'propria',
  brand TEXT,
  total_amount_g INTEGER,
  portion_g INTEGER,
  meals_per_day INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.boarding_food TO authenticated;
GRANT ALL ON public.boarding_food TO service_role;
ALTER TABLE public.boarding_food ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boarding_food staff all" ON public.boarding_food FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "boarding_food tutor read own" ON public.boarding_food FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.boarding_stays s JOIN public.dogs d ON d.id=s.dog_id JOIN public.tutors t ON t.id=d.tutor_id WHERE s.id=boarding_food.stay_id AND t.user_id=auth.uid()));

CREATE INDEX idx_food_stay ON public.boarding_food(stay_id);

-- ============ boarding_medications ============
CREATE TABLE public.boarding_medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stay_id UUID NOT NULL REFERENCES public.boarding_stays(id) ON DELETE CASCADE,
  medication TEXT NOT NULL,
  dose TEXT,
  frequency TEXT,
  schedule TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.boarding_medications TO authenticated;
GRANT ALL ON public.boarding_medications TO service_role;
ALTER TABLE public.boarding_medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boarding_med staff all" ON public.boarding_medications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "boarding_med tutor read own" ON public.boarding_medications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.boarding_stays s JOIN public.dogs d ON d.id=s.dog_id JOIN public.tutors t ON t.id=d.tutor_id WHERE s.id=boarding_medications.stay_id AND t.user_id=auth.uid()));

CREATE INDEX idx_bmed_stay ON public.boarding_medications(stay_id);

-- ============ boarding_daily_logs ============
CREATE TABLE public.boarding_daily_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stay_id UUID NOT NULL REFERENCES public.boarding_stays(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  fed_ok BOOLEAN NOT NULL DEFAULT true,
  medication_ok BOOLEAN NOT NULL DEFAULT true,
  mood TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(stay_id, log_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.boarding_daily_logs TO authenticated;
GRANT ALL ON public.boarding_daily_logs TO service_role;
ALTER TABLE public.boarding_daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "boarding_log staff all" ON public.boarding_daily_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "boarding_log tutor read own" ON public.boarding_daily_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.boarding_stays s JOIN public.dogs d ON d.id=s.dog_id JOIN public.tutors t ON t.id=d.tutor_id WHERE s.id=boarding_daily_logs.stay_id AND t.user_id=auth.uid()));

CREATE INDEX idx_blog_stay ON public.boarding_daily_logs(stay_id);

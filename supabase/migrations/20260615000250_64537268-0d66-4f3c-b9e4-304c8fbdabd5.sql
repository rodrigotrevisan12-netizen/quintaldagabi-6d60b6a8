
CREATE TYPE public.dog_size AS ENUM ('mini','pequeno','medio','grande','gigante');
CREATE TYPE public.dog_sex AS ENUM ('macho','femea');
CREATE TYPE public.behavior_trait AS ENUM ('sociavel','dominante','medroso','reativo','agressivo','ansioso');

CREATE TABLE public.dogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.units(id),
  name text NOT NULL,
  photo_url text,
  breed text,
  size public.dog_size,
  weight_kg numeric(5,2),
  sex public.dog_sex,
  neutered boolean DEFAULT false,
  birth_date date,
  microchip text,
  vet_name text,
  vet_phone text,
  plan text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dogs TO authenticated;
GRANT ALL ON public.dogs TO service_role;
ALTER TABLE public.dogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff full access dogs" ON public.dogs FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "tutor read own dogs" ON public.dogs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.tutors t WHERE t.id = dogs.tutor_id AND t.user_id = auth.uid()));
CREATE TRIGGER trg_dogs_updated BEFORE UPDATE ON public.dogs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_dogs_tutor ON public.dogs(tutor_id);

CREATE TABLE public.dog_vaccines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  vaccine_type text NOT NULL,
  applied_date date NOT NULL,
  next_due_date date,
  batch text,
  vet_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dog_vaccines TO authenticated;
GRANT ALL ON public.dog_vaccines TO service_role;
ALTER TABLE public.dog_vaccines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff vaccines" ON public.dog_vaccines FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "tutor read vaccines" ON public.dog_vaccines FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.dogs d JOIN public.tutors t ON t.id=d.tutor_id WHERE d.id=dog_vaccines.dog_id AND t.user_id=auth.uid()));
CREATE TRIGGER trg_vacc_updated BEFORE UPDATE ON public.dog_vaccines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_vacc_dog ON public.dog_vaccines(dog_id);

CREATE TABLE public.dog_dewormings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  product text,
  applied_date date NOT NULL,
  next_due_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dog_dewormings TO authenticated;
GRANT ALL ON public.dog_dewormings TO service_role;
ALTER TABLE public.dog_dewormings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff deworm" ON public.dog_dewormings FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "tutor read deworm" ON public.dog_dewormings FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.dogs d JOIN public.tutors t ON t.id=d.tutor_id WHERE d.id=dog_dewormings.dog_id AND t.user_id=auth.uid()));
CREATE TRIGGER trg_dw_updated BEFORE UPDATE ON public.dog_dewormings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_dw_dog ON public.dog_dewormings(dog_id);

CREATE TABLE public.dog_flea_treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  product text,
  applied_date date NOT NULL,
  next_due_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dog_flea_treatments TO authenticated;
GRANT ALL ON public.dog_flea_treatments TO service_role;
ALTER TABLE public.dog_flea_treatments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff flea" ON public.dog_flea_treatments FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "tutor read flea" ON public.dog_flea_treatments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.dogs d JOIN public.tutors t ON t.id=d.tutor_id WHERE d.id=dog_flea_treatments.dog_id AND t.user_id=auth.uid()));
CREATE TRIGGER trg_fl_updated BEFORE UPDATE ON public.dog_flea_treatments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_fl_dog ON public.dog_flea_treatments(dog_id);

CREATE TABLE public.dog_allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  description text NOT NULL,
  severity text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dog_allergies TO authenticated;
GRANT ALL ON public.dog_allergies TO service_role;
ALTER TABLE public.dog_allergies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff allergies" ON public.dog_allergies FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "tutor read allergies" ON public.dog_allergies FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.dogs d JOIN public.tutors t ON t.id=d.tutor_id WHERE d.id=dog_allergies.dog_id AND t.user_id=auth.uid()));
CREATE TRIGGER trg_al_updated BEFORE UPDATE ON public.dog_allergies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.dog_diet_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dog_diet_restrictions TO authenticated;
GRANT ALL ON public.dog_diet_restrictions TO service_role;
ALTER TABLE public.dog_diet_restrictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff diet" ON public.dog_diet_restrictions FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "tutor read diet" ON public.dog_diet_restrictions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.dogs d JOIN public.tutors t ON t.id=d.tutor_id WHERE d.id=dog_diet_restrictions.dog_id AND t.user_id=auth.uid()));
CREATE TRIGGER trg_dt_updated BEFORE UPDATE ON public.dog_diet_restrictions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.dog_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  name text NOT NULL,
  dose text,
  frequency text,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dog_medications TO authenticated;
GRANT ALL ON public.dog_medications TO service_role;
ALTER TABLE public.dog_medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff meds" ON public.dog_medications FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "tutor read meds" ON public.dog_medications FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.dogs d JOIN public.tutors t ON t.id=d.tutor_id WHERE d.id=dog_medications.dog_id AND t.user_id=auth.uid()));
CREATE TRIGGER trg_md_updated BEFORE UPDATE ON public.dog_medications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.dog_medical_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  event_date date NOT NULL,
  description text NOT NULL,
  vet_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dog_medical_history TO authenticated;
GRANT ALL ON public.dog_medical_history TO service_role;
ALTER TABLE public.dog_medical_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff history" ON public.dog_medical_history FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "tutor read history" ON public.dog_medical_history FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.dogs d JOIN public.tutors t ON t.id=d.tutor_id WHERE d.id=dog_medical_history.dog_id AND t.user_id=auth.uid()));
CREATE TRIGGER trg_mh_updated BEFORE UPDATE ON public.dog_medical_history FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.dog_behavior (
  dog_id uuid PRIMARY KEY REFERENCES public.dogs(id) ON DELETE CASCADE,
  traits public.behavior_trait[] NOT NULL DEFAULT '{}',
  compat_small boolean NOT NULL DEFAULT false,
  compat_medium boolean NOT NULL DEFAULT false,
  compat_large boolean NOT NULL DEFAULT false,
  compat_males boolean NOT NULL DEFAULT false,
  compat_females boolean NOT NULL DEFAULT false,
  notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dog_behavior TO authenticated;
GRANT ALL ON public.dog_behavior TO service_role;
ALTER TABLE public.dog_behavior ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff behavior" ON public.dog_behavior FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "tutor read behavior" ON public.dog_behavior FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.dogs d JOIN public.tutors t ON t.id=d.tutor_id WHERE d.id=dog_behavior.dog_id AND t.user_id=auth.uid()));
CREATE TRIGGER trg_bh_updated BEFORE UPDATE ON public.dog_behavior FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.dog_behavior_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  event_date date NOT NULL DEFAULT CURRENT_DATE,
  traits public.behavior_trait[] NOT NULL DEFAULT '{}',
  compat_small boolean,
  compat_medium boolean,
  compat_large boolean,
  compat_males boolean,
  compat_females boolean,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dog_behavior_history TO authenticated;
GRANT ALL ON public.dog_behavior_history TO service_role;
ALTER TABLE public.dog_behavior_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff bh hist" ON public.dog_behavior_history FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "tutor read bh hist" ON public.dog_behavior_history FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.dogs d JOIN public.tutors t ON t.id=d.tutor_id WHERE d.id=dog_behavior_history.dog_id AND t.user_id=auth.uid()));
CREATE INDEX idx_bh_hist_dog ON public.dog_behavior_history(dog_id, event_date DESC);

CREATE POLICY "admins manage roles ins" ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles upd" ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles del" ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin'));


-- ============ TUTORS ============
CREATE TABLE public.tutors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  cpf TEXT,
  rg TEXT,
  birth_date DATE,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tutors_unit ON public.tutors(unit_id);
CREATE INDEX idx_tutors_user ON public.tutors(user_id);
CREATE INDEX idx_tutors_name ON public.tutors(full_name);
CREATE UNIQUE INDEX idx_tutors_cpf ON public.tutors(cpf) WHERE cpf IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutors TO authenticated;
GRANT ALL ON public.tutors TO service_role;
ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;

CREATE POLICY tutors_staff_all ON public.tutors
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

CREATE POLICY tutors_self_select ON public.tutors
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_tutors_updated_at
  BEFORE UPDATE ON public.tutors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ EMERGENCY CONTACTS ============
CREATE TABLE public.tutor_emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_emerg_tutor ON public.tutor_emergency_contacts(tutor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutor_emergency_contacts TO authenticated;
GRANT ALL ON public.tutor_emergency_contacts TO service_role;
ALTER TABLE public.tutor_emergency_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY emerg_staff_all ON public.tutor_emergency_contacts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

CREATE POLICY emerg_self_select ON public.tutor_emergency_contacts
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tutors t WHERE t.id = tutor_id AND t.user_id = auth.uid()));

CREATE TRIGGER trg_emerg_updated_at
  BEFORE UPDATE ON public.tutor_emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ AUTHORIZED PICKUPS ============
CREATE TABLE public.tutor_authorized_pickups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id UUID NOT NULL REFERENCES public.tutors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  document TEXT,
  phone TEXT,
  relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pickup_tutor ON public.tutor_authorized_pickups(tutor_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutor_authorized_pickups TO authenticated;
GRANT ALL ON public.tutor_authorized_pickups TO service_role;
ALTER TABLE public.tutor_authorized_pickups ENABLE ROW LEVEL SECURITY;

CREATE POLICY pickup_staff_all ON public.tutor_authorized_pickups
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

CREATE POLICY pickup_self_select ON public.tutor_authorized_pickups
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tutors t WHERE t.id = tutor_id AND t.user_id = auth.uid()));

CREATE TRIGGER trg_pickup_updated_at
  BEFORE UPDATE ON public.tutor_authorized_pickups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

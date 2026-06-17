
CREATE TYPE public.schedule_status AS ENUM ('pending', 'done', 'not_done');

CREATE TABLE public.daily_schedule_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  activity TEXT NOT NULL,
  description TEXT,
  responsible_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  location TEXT,
  requires_photo BOOLEAN NOT NULL DEFAULT false,
  requires_confirmation BOOLEAN NOT NULL DEFAULT false,
  status public.schedule_status NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  not_done_reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX dsi_date_idx ON public.daily_schedule_items(date);
CREATE INDEX dsi_responsible_idx ON public.daily_schedule_items(responsible_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_schedule_items TO authenticated;
GRANT ALL ON public.daily_schedule_items TO service_role;

ALTER TABLE public.daily_schedule_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dsi admin all" ON public.daily_schedule_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "dsi func read assigned" ON public.daily_schedule_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'funcionario') AND responsible_id = auth.uid());

CREATE POLICY "dsi func update assigned" ON public.daily_schedule_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'funcionario') AND responsible_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'funcionario') AND responsible_id = auth.uid());

CREATE TRIGGER dsi_updated BEFORE UPDATE ON public.daily_schedule_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.daily_schedule_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.daily_schedule_items(id) ON DELETE CASCADE,
  dog_id UUID NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (item_id, dog_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_schedule_participants TO authenticated;
GRANT ALL ON public.daily_schedule_participants TO service_role;

ALTER TABLE public.daily_schedule_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dsp staff all" ON public.daily_schedule_participants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

CREATE TABLE public.daily_schedule_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.daily_schedule_items(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_schedule_photos TO authenticated;
GRANT ALL ON public.daily_schedule_photos TO service_role;

ALTER TABLE public.daily_schedule_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dsphotos staff all" ON public.daily_schedule_photos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

CREATE TABLE public.daily_schedule_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.daily_schedule_items(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  previous_status public.schedule_status,
  new_status public.schedule_status NOT NULL,
  note TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.daily_schedule_history TO authenticated;
GRANT ALL ON public.daily_schedule_history TO service_role;

ALTER TABLE public.daily_schedule_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dshist staff read" ON public.daily_schedule_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

CREATE POLICY "dshist staff insert" ON public.daily_schedule_history FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

CREATE OR REPLACE FUNCTION public.record_schedule_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.daily_schedule_history (item_id, changed_by, previous_status, new_status, note)
    VALUES (NEW.id, auth.uid(), OLD.status, NEW.status, NEW.not_done_reason);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_schedule_status_change() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER dsi_status_change AFTER UPDATE ON public.daily_schedule_items
  FOR EACH ROW EXECUTE FUNCTION public.record_schedule_status_change();

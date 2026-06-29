CREATE TABLE IF NOT EXISTS public.daycare_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  days_per_week INT NOT NULL CHECK (days_per_week BETWEEN 1 AND 7),
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  extra_day_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daycare_packages TO authenticated;
GRANT ALL ON public.daycare_packages TO service_role;
ALTER TABLE public.daycare_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dpkg read auth" ON public.daycare_packages FOR SELECT TO authenticated USING (true);
CREATE POLICY "dpkg write admin" ON public.daycare_packages FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

ALTER TABLE public.dogs ADD COLUMN IF NOT EXISTS daycare_package_id UUID REFERENCES public.daycare_packages(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_dogs_daycare_pkg ON public.dogs(daycare_package_id);

ALTER TABLE public.financial_transactions ADD COLUMN IF NOT EXISTS reference_month DATE;

CREATE OR REPLACE FUNCTION public.trg_daycare_charge_fn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_pkg RECORD; v_dog RECORD;
  v_month_start DATE; v_month_end DATE;
  v_completed INT; v_allowance INT; v_rate NUMERIC; v_already_monthly INT;
BEGIN
  IF NEW.check_out_at IS NULL THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND OLD.check_out_at IS NOT NULL THEN RETURN NEW; END IF;

  SELECT d.id, d.tutor_id, d.daycare_package_id INTO v_dog
    FROM dogs d WHERE d.id=NEW.dog_id;
  IF v_dog IS NULL OR v_dog.tutor_id IS NULL THEN RETURN NEW; END IF;

  v_month_start := date_trunc('month', NEW.check_out_at)::date;
  v_month_end   := (v_month_start + INTERVAL '1 month')::date;

  IF v_dog.daycare_package_id IS NOT NULL THEN
    SELECT * INTO v_pkg FROM daycare_packages WHERE id=v_dog.daycare_package_id;
    v_allowance := v_pkg.days_per_week * 4;

    SELECT COUNT(*) INTO v_completed FROM daycare_stays
      WHERE dog_id=NEW.dog_id AND check_out_at IS NOT NULL
        AND check_out_at >= v_month_start AND check_out_at < v_month_end;

    SELECT COUNT(*) INTO v_already_monthly FROM financial_transactions
      WHERE tutor_id=v_dog.tutor_id
        AND category='mensalidade_creche'
        AND reference_month = v_month_start
        AND dog_id = NEW.dog_id;

    IF v_already_monthly = 0 THEN
      INSERT INTO financial_transactions (kind, category, amount, tutor_id, dog_id, status, due_date, description, related_id, reference_month)
      VALUES ('receita','mensalidade_creche', v_pkg.monthly_price, v_dog.tutor_id, NEW.dog_id, 'pendente',
              (v_month_start + INTERVAL '10 days')::date,
              'Mensalidade Creche ' || to_char(v_month_start,'MM/YYYY') || ' - ' || v_pkg.name,
              v_dog.daycare_package_id::text, v_month_start);
    END IF;

    IF v_completed > v_allowance AND v_pkg.extra_day_price > 0 THEN
      INSERT INTO financial_transactions (kind, category, amount, tutor_id, dog_id, status, due_date, description, related_id)
      VALUES ('receita','diaria_extra_creche', v_pkg.extra_day_price, v_dog.tutor_id, NEW.dog_id, 'pendente',
              (NEW.check_out_at)::date,
              'Diária extra creche - ' || to_char(NEW.check_out_at,'DD/MM/YYYY'),
              NEW.id::text);
    END IF;
  ELSE
    SELECT COALESCE((SELECT daycare_daily_rate FROM unit_settings LIMIT 1), 0) INTO v_rate;
    IF v_rate > 0 THEN
      INSERT INTO financial_transactions (kind, category, amount, tutor_id, dog_id, status, due_date, description, related_id)
      VALUES ('receita','diaria_creche', v_rate, v_dog.tutor_id, NEW.dog_id, 'pendente',
              (NEW.check_out_at)::date,
              'Diária creche - ' || to_char(NEW.check_out_at,'DD/MM/YYYY'),
              NEW.id::text);
    END IF;
  END IF;
  RETURN NEW;
END $$;